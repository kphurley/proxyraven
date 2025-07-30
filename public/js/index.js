// eslint-disable-next-line max-classes-per-file,import/extensions
import { loadSettings, fetchJson } from './helpers.js';

// eslint-disable-next-line max-classes-per-file,import/extensions
import { adaptCardListToCardTitleDB, adaptCardListToCardCodeDB, adaptCardListToPackList } from './adaptors.js';

let cardTitleDB;
let cardCodeDB;
let packList;
let cardListTextArea;
let setSelection;
let deckURLText;
let cardManager;
let settings;
let sessionID = 0;
let playsetSelection;
let selectedTab = 'Card List';
let isGeneratingProxies = false;

const IMAGE_BASE_DIR = 'https://proxynexus.blob.core.windows.net/version2/';
const NRDB_API_DIR = 'https://netrunnerdb.com/api/2.0/public/';
const NRDB_CARD_DIR = 'https://netrunnerdb.com/en/card/';

// function t2key(t) {
//   return t.trim().toLowerCase().replace(/:/g, '').replace(new RegExp(' ', 'g'), '__');
// }

async function postData(url, data) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const message = `An error has occurred fetching from ${url}: ${response.status}`;
    throw new Error(message);
  }
  return response.json();
}

class Card {
  constructor(code, id) {
    this.code = code;
    this.id = id;
    this.cardFromDB = cardCodeDB[this.code];
    this.title = this.cardFromDB.label;
    this.typeCode = this.cardFromDB.type_code;
    const scanSourcePrioritiesLists = {
      pt: ['pt', 'lm', 'de'],
      lm: ['lm', 'pt', 'de'],
      de: ['de', 'pt', 'lm'],
    };
    this.sourcePriorities = scanSourcePrioritiesLists[settings.scanSourcePriority];
    // const cardCodes = cardTitleDB[this.title].codes;
    // this.altArts = this.sourcePriorities.reduce((acc, source) => {
    //   const tempAcc = [];
    //   cardCodes.forEach((altCode) => {
    //     const altCard = cardCodeDB[altCode];
    //     if (altCard.availableSources.includes(source)) {
    //       tempAcc.push({ code: altCode, source });
    //     }
    //   });
    //   // move alt arts to the end of tempAcc
    //   const cardsAcc = [];
    //   const altAcc = [];
    //   tempAcc.forEach((entry) => {
    //     if (entry.code.includes('alt')) {
    //       altAcc.push(entry);
    //     } else {
    //       cardsAcc.push(entry);
    //     }
    //   });
    //   acc.push(...cardsAcc, ...altAcc);
    //   return acc;
    // }, []);

    // Confirm that the current card code file is available for the primary scan source
    // let foundCard = false;
    // for (let i = 0; i < this.altArts.length; i += 1) {
    //   const entry = this.altArts[i];
    //   if (entry.code === this.code && entry.source === this.sourcePriorities[0]) {
    //     foundCard = true;
    //     [this.scanSource] = this.sourcePriorities;
    //     break;
    //   }
    // }

    // Use first alt art if current card code isn't found
    // if (!foundCard) {
    //   this.code = this.altArts[0].code;
    //   this.scanSource = this.altArts[0].source;
    //   this.cardFromDB = cardCodeDB[this.code];
    // }

    this.usingPrimarySource = this.scanSource === this.sourcePriorities[0];
    this.setPreviews();
  }

  setPreviews() {
    // const previewSourceKey = `${this.scanSource}Preview`;
    // this.frontPrev = this.cardFromDB[previewSourceKey].front;
    this.frontPrev = this.cardFromDB.image_url;
    // this.backPrev = this.cardFromDB[previewSourceKey].back;
  }

  cycleAltArt(forward = true) {
    const codeIndex = this.altArts.findIndex((altArt) => (
      altArt.code === this.code && altArt.source === this.scanSource));
    const newIndex = (codeIndex + this.altArts.length + (forward ? 1 : -1)) % this.altArts.length;
    const newCode = this.altArts[newIndex].code;
    const newSource = this.altArts[newIndex].source;
    document.getElementById(`altArtSelect${this.id}`).value = `${newCode}-${newSource}`;
    this.setCode(newCode, newSource);
  }

  setCode(code, source) {
    this.code = code;
    this.scanSource = source;
    this.cardFromDB = cardCodeDB[this.code];
    this.usingPrimarySource = this.scanSource === this.sourcePriorities[0];
    this.setPreviews();
    document.getElementById(`previewCard${this.id}`).src = `${IMAGE_BASE_DIR}${this.frontPrev}`;

    if (this.backPrev !== '' && settings.includeCardBacks === 'true') {
      document.getElementById(`previewCardBack${this.id}`).style.display = '';
      document.getElementById(`previewCardBackImg${this.id}`).src = `${IMAGE_BASE_DIR}${this.backPrev}`;
    } else {
      document.getElementById(`previewCardBack${this.id}`).style.display = 'none';
      document.getElementById(`previewCardBackImg${this.id}`).src = '';
    }
  }

  getPreviewHTML() {
    let newHtml = '';
    let imgClass = (this.usingPrimarySource) ? 'card' : 'cardFallback';
    if (this.typeCode === 'plot') {
      imgClass += ' rotateLeft';
    }
    const frontImgURL = `${this.frontPrev}`;
    newHtml += `<a href="${NRDB_CARD_DIR}${this.code}" title="" target="NetrunnerCard">`;
    newHtml += `<img class="${imgClass}" id="previewCard${this.id}" src="${frontImgURL}" alt="${this.code}" />`;
    newHtml += `<span class="label">${this.code} ${this.title}</span>`;
    newHtml += '</a>';
    // let backImgURL = '';
    // let backImgStyle = 'display: none;';
    // if (this.backPrev !== '' && settings.includeCardBacks === 'true') {
    //   backImgURL = `${IMAGE_BASE_DIR}${this.backPrev}`;
    //   backImgStyle = '';
    // }

    // newHtml += `<a id="previewCardBack${this.id}" style="${backImgStyle}" href="${NRDB_CARD_DIR}${this.code}" title="" target="NetrunnerCard">`;
    // newHtml += `<img class="${imgClass}" id="previewCardBackImg${this.id}" src="${backImgURL}" alt="${this.code}back"/>`;
    // newHtml += `<span class="label">${this.code} ${this.title}</span>`;
    // newHtml += '</a>';

    return newHtml;
  }

  getAltArtSelectorHTML() {
    if (this.altArts.length === 1) {
      return '';
    }
    const sourceLabels = {
      pt: '(New)',
      lm: '(Legacy)',
      de: '(German)',
    };
    let selectorHtml = '<li class="list-group-item d-flex justify-content-between align-items-start">';
    selectorHtml += '<div class="me-2 mt-auto">';
    selectorHtml += `<button id="cycleLeft${this.id}" type="button" class="btn btn-light btn-sm">`;
    selectorHtml += '<span class="fas fa-chevron-left"></span>';
    selectorHtml += '</button></div>';
    selectorHtml += '<div style="width: 100%">';
    selectorHtml += this.title;
    selectorHtml += `<select id="altArtSelect${this.id}" class="form-select form-select-sm">`;
    this.altArts.forEach((altArt) => {
      const altCard = cardCodeDB[altArt.code];
      const selected = (altCard.code === this.code) ? 'selected' : '';
      selectorHtml += `<option ${selected} value="${altArt.code}-${altArt.source}">${altCard.pack} ${sourceLabels[altArt.source]}</option>`;
    });
    selectorHtml += '</select></div>';
    selectorHtml += '<div class="ms-2 mt-auto">';
    selectorHtml += `<button id="cycleRight${this.id}" type="button" class="btn btn-light btn-sm">`;
    selectorHtml += '<span class="fas fa-chevron-right"></span>';
    selectorHtml += '</button></div></li>';
    return selectorHtml;
  }

  getAltArtSelectorEvents() {
    return {
      right: () => cardManager.cycleCardAltArt(this.id),
      left: () => cardManager.cycleCardAltArt(this.id, false),
      select: (e) => cardManager.setCardCode(this.id, e.target.value),
    };
  }
}

class CardManager {
  constructor() {
    this.cardPreview = document.getElementById('cardPreview');
    this.altArtSelector = document.getElementById('altArtSelector');
    this.maxCardId = 0;
    this.cards = {};
    this.cardIdOrder = [];
  }

  resetScroll() {
    this.cardPreview.scroll({
      top: 0,
      behavior: 'auto',
    });
    this.altArtSelector.scroll({
      top: 0,
      behavior: 'auto',
    });
  }

  addCard(code, i) {
    this.maxCardId += 1;
    this.cards[this.maxCardId] = new Card(code, this.maxCardId);
    this.cardIdOrder.splice(i, 0, this.maxCardId.toString());
  }

  cycleCardAltArt(id, forward = true) {
    this.cards[id].cycleAltArt(forward);
  }

  setCardCode(id, value) {
    const [code, source] = value.split('-');
    this.cards[id].setCode(code, source);
  }

  setCardPreviewHTML(html) {
    this.cardPreview.innerHTML = html;
  }

  buildCardHTML(unfoundCount = 0, unfoundCards = []) {
    let previewHtml = '';
    let altArtSelectorHtml = '';
    this.cardIdOrder.forEach((id) => {
      const card = this.cards[id];
      previewHtml += card.getPreviewHTML();
      //altArtSelectorHtml += card.getAltArtSelectorHTML();
    });
    if (unfoundCount > 0) {
      let unfoundHtml = '<div><p>Entries not found:</p><ul>';
      unfoundCards.forEach((entry) => {
        unfoundHtml += `<li>${entry}</li>`;
      });
      unfoundHtml += '</ul></div>';
      previewHtml += unfoundHtml;
    }
    this.setCardPreviewHTML(previewHtml);
    if (altArtSelectorHtml !== '') {
      altArtSelectorHtml = `<h6>Alt Arts</h6>${altArtSelectorHtml}`;
    }
    this.altArtSelector.innerHTML = altArtSelectorHtml;
    // this.cardIdOrder.forEach((id) => {
    //   const card = this.cards[id];
    //   if (card.altArts.length > 1) {
    //     const events = card.getAltArtSelectorEvents();
    //     document.getElementById(`cycleLeft${card.id}`).addEventListener('click', events.left);
    //     document.getElementById(`cycleRight${card.id}`).addEventListener('click', events.right);
    //     document.getElementById(`altArtSelect${card.id}`).addEventListener('input', events.select);
    //   }
    // });
  }

  updateCardListFromTextArea(cardListText) {
    const input = cardListText.split(/\n/).filter((e) => (e !== ''));
    const cardInputRegex = /([0-9] |[0-9]x )?(.*)/;
    const cardTitles = Object.values(this.cards).map((c) => c.label);
    const newCardTitles = [];
    const unfoundCards = [];
    let unfoundCount = 0;

    input.forEach((entry) => {
      const match = cardInputRegex.exec(entry);
      const count = (match[1] === undefined) ? 1 : parseInt(match[1], 10);
      //const cardKey = t2key(match[2]);
      const cardKey = match[2];

      if (cardKey in cardTitleDB) {
        for (let i = 0; i < count; i += 1) {
          const cardTitle = cardTitleDB[cardKey].label;
          newCardTitles.push(cardTitle);
        }
      } else {
        unfoundCards.push(entry);
        unfoundCount += 1;
      }
    });

    const IDsOfCardsToRemove = [];
    const temp = [...newCardTitles];
    Object.entries(this.cards).forEach(([id, card]) => {
      if (temp.includes(card.title)) {
        temp.splice(temp.indexOf(card.title), 1);
      } else {
        IDsOfCardsToRemove.push(id);
      }
    });

    IDsOfCardsToRemove.forEach((id) => {
      delete this.cards[id];
      this.cardIdOrder.splice(this.cardIdOrder.indexOf(id), 1);
    });

    const cardsToCreate = [];
    const temp2 = [...cardTitles];
    newCardTitles.forEach((title, i) => {
      if (temp2.includes(title)) {
        temp2.splice(temp2.indexOf(title), 1);
      } else {
        cardsToCreate.push({ title, i });
      }
    });

    cardsToCreate.forEach(({ title, i }) => {
      const [code] = cardTitleDB[title].codes;
      this.addCard(code, i);
    });

    this.buildCardHTML(unfoundCount, unfoundCards);
  }

  setCardList(newCards) {
    this.cards = {};
    this.cardIdOrder = [];
    //let count = 0;
    newCards.forEach((card) => {
      // Not sure how to deal with quantities yet, so just add one of each card
      // for (let j = 0; j < card.quantity; j += 1) {
      //   this.addCard(card.code, count);
      //   count += 1;
      // }

      this.addCard(card.code, 1);
    });

    this.buildCardHTML();
  }

  updateCardListFromSetSelection(packCode) {
    let isCoreSet = false;
    packList.forEach((pack) => {
      if (pack.pack_code === packCode && pack.is_core) {
        isCoreSet = true;
      }
    });

    const playsetDisplay = document.getElementById('playsetDisplay');
    if (isCoreSet) {
      playsetDisplay.style.display = 'block';
    } else {
      playsetDisplay.style.display = 'none';
    }

    const cardList = Object.values(cardCodeDB).filter((card) => (card.pack_code === packCode));

    this.setCardList(cardList);
  }

  updateCardListFromDecklistURL(url) {
    const publishedDeckIDRegex = /(\/en\/decklist\/)((?:\w|-)+)/;
    const unpublishedDeckIDRegex = /(\/deck\/view\/)((?:\w|-)+)/;
    const publishedMatch = publishedDeckIDRegex.exec(url);
    const unpublishedMatch = unpublishedDeckIDRegex.exec(url);
    let deckId;
    let apiOption;

    if (publishedMatch) {
      [, , deckId] = publishedMatch;
      apiOption = 'decklist/';
    } else if (unpublishedMatch) {
      [, , deckId] = unpublishedMatch;
      apiOption = 'deck/';
    }

    if (deckId) {
      fetchJson(`${NRDB_API_DIR}${apiOption}${deckId}`)
        .then((res) => {
          const newCards = Object.entries(res.data[0].cards)
            .map(([code, quantity]) => ({ code, quantity }));
          this.setCardList(newCards);
        });
    }
  }

  getCardList() {
    return this.cardIdOrder.map((id) => ({
      code: this.cards[id].code,
      source: this.cards[id].scanSource,
      side: this.cards[id].side,
    }));
  }
}

function loadStoredSelections() {
  const storedCardList = localStorage.getItem('cardList');
  if (storedCardList) {
    cardListTextArea.value = storedCardList;
  } else {
    const chosenCards = [];
    for (let i = 0; i < 3; i += 1) {
      const randIndex = Math.floor(Math.random() * Object.keys(cardTitleDB).length);
      const cardTitleList = Object.keys(cardTitleDB);
      const cardTitle = cardTitleList[randIndex];
      const cardCode = cardTitleDB[cardTitle].codes[0];
      chosenCards.push(cardCodeDB[cardCode].title);
    }
    cardListTextArea.value = `${chosenCards[0]}\n${chosenCards[1]}\n${chosenCards[2]}\n`;
    localStorage.setItem('cardList', cardListTextArea.value);
  }
  cardManager.updateCardListFromTextArea(cardListTextArea.value);

  const storedDeckURLText = localStorage.getItem('deckURLText');
  if (storedDeckURLText) {
    deckURLText.value = storedDeckURLText;
  }
}

function populateSetSelection() {
  packList.forEach((pack) => {
    const option = document.createElement('option');
    option.setAttribute('value', pack.pack_code);
    option.innerHTML = pack.name;
    setSelection.appendChild(option);
  });

  const storedSetSelection = localStorage.getItem('setSelection');
  if (storedSetSelection) {
    setSelection.value = storedSetSelection;
  } else {
    setSelection.value = packList[0].pack_code;
  }
}

function loadOptions() {
  cardManager.setCardPreviewHTML('<span class="text-muted" data-loading>LOADING CARDS...</span>');

  fetchJson('https://thronesdb.com/api/public/cards/?v=2.0')
    .then((thronesCards) => {
      cardTitleDB = adaptCardListToCardTitleDB(thronesCards);
      cardCodeDB = adaptCardListToCardCodeDB(thronesCards);
      packList = adaptCardListToPackList(thronesCards);

      loadStoredSelections();
      populateSetSelection();
    })
    .catch((err) => {
      console.error(err);
    });
}

function selectTab(tabLabel) {
  selectedTab = tabLabel;
  switch (tabLabel) {
    case 'Card List':
      cardManager.updateCardListFromTextArea(cardListTextArea.value);
      break;
    case 'Set':
      cardManager.updateCardListFromSetSelection(setSelection.value);
      break;
    case 'Decklist':
      cardManager.updateCardListFromDecklistURL(deckURLText.value);
      break;
    default:
      break;
  }
}

function containsNISEICards(cardList) {
  for (let i = 0; i < cardList.length; i += 1) {
    const entry = cardList[i];
    if (parseInt(entry.code.substring(0, 2), 10) >= 26) {
      return true;
    }
  }
  return false;
}

function assignEvents() {
  cardListTextArea.addEventListener('input', (e) => {
    // Hack to prevent extra cards from appearing due to pressing enter
    if (e.inputType === 'insertLineBreak') {
      return;
    }

    cardManager.updateCardListFromTextArea(e.target.value);
    localStorage.setItem('cardList', e.target.value);
  });

  setSelection.addEventListener('input', (e) => {
    cardManager.resetScroll();
    playsetSelection.classList.remove('selected');
    playsetSelection = document.getElementById('playset-btn-single-set');
    playsetSelection.classList.add('selected');
    cardManager.updateCardListFromSetSelection(e.target.value);
    localStorage.setItem('setSelection', e.target.value);
  });

  deckURLText.addEventListener('input', (e) => {
    cardManager.resetScroll();
    cardManager.updateCardListFromDecklistURL(e.target.value);
    localStorage.setItem('deckURLText', e.target.value);
  });

  const navSelectors = document.querySelectorAll('button[data-bs-toggle="tab"]');
  navSelectors.forEach((selector) => {
    selector.addEventListener('shown.bs.tab', (e) => {
      cardManager.resetScroll();
      cardManager.cards = {};
      cardManager.cardIdOrder = [];
      selectTab(e.target.innerText);
      selectedTab = e.target.innerText;
    });
  });

  const playsetButtons = document.getElementsByClassName('playset-btn');
  Array.from(playsetButtons).forEach((btn) => {
    btn.addEventListener('click', (e) => {
      playsetSelection.classList.remove('selected');
      playsetSelection = e.target;
      playsetSelection.classList.add('selected');
      cardManager.updateCardListFromSetSelection(setSelection.value);
    });
  });

  document.getElementById('generateBtn')
    .addEventListener('click', () => {
      const generateSettings = {
        sessionID,
        selectedTab,
        cardListTextArea: cardListTextArea.value,
        selectedSet: setSelection.value,
        playsetSelection: playsetSelection.value,
        deckURLText: deckURLText.value,
        generateType: document.querySelector('input[name="generationType"]:checked').value,
        cardList: cardManager.getCardList(),
        PdfPageSize: settings.PdfPageSize,
        LmMpcPlacement: settings.LmMpcPlacement,
        fullCutLines: (settings.fullCutLines === 'true'),
        includeCardBacks: (settings.includeCardBacks === 'true'),
      };
      postData('/api/generate', generateSettings)
        .then(() => {
          isGeneratingProxies = true;
          document.getElementById('progressBarDiv').style.opacity = '1';
          document.getElementById('generateBtn').disabled = true;
          document.getElementById('progressBar').display = 'block';
          document.getElementById('issueMsg').style.display = 'block';
          if (containsNISEICards(generateSettings.cardList) && generateSettings.generateType === 'mpc') {
            document.getElementById('niseiCardNotice').style.display = 'block';
          }
        })
        .catch((err) => {
          console.log(err.message);
        });
    });

  const eventSource = new EventSource('/api/getGenStatus');
  eventSource.addEventListener('message', (e) => {
    const data = JSON.parse(e.data);
    switch (data.status) {
      case 'init connection': {
        if (sessionID === 0) {
          sessionID = data.msg;
        }
        break;
      }
      case 'waiting':
      case 'in progress': {
        if (isGeneratingProxies) {
          document.getElementById('progressBar').style.width = `${data.progress}%`;
          document.getElementById('progressBar').innerHTML = `${Math.round(data.progress)}%`;
          document.getElementById('progressStatus').innerHTML = data.msg;
        }
        break;
      }
      case 'completed': {
        isGeneratingProxies = false;
        document.getElementById('progressBarDiv').style.opacity = '0';
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('progressBar').innerHTML = '';
        document.getElementById('generateBtn').disabled = false;
        document.getElementById('progressStatus').innerHTML = '';
        window.open(`/api/getFile/${data.msg}`, '_blank');
        break;
      }
      default:
        break;
    }
  }, false);

  eventSource.addEventListener('open', () => {
    console.log('Connected');
    document.getElementById('HeadMsg').innerHTML = '';
    document.getElementById('generateBtn').disabled = false;
  }, false);

  eventSource.addEventListener('error', () => {
    sessionID = 0;
    document.getElementById('HeadMsg').innerHTML = 'Lost connection to server, try refreshing your browser';
    document.getElementById('generateBtn').disabled = true;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  cardManager = new CardManager();
  cardListTextArea = document.getElementById('cardListTextArea');
  setSelection = document.getElementById('setSelection');
  deckURLText = document.getElementById('deckURLText');
  playsetSelection = document.getElementById('playset-btn-single-set');

  settings = loadSettings(() => {
    // eslint-disable-next-line no-undef
    const welcomeModal = new bootstrap.Modal(document.getElementById('welcomeModal'), {});
    welcomeModal.show();
  });
  assignEvents();
  loadOptions();
});
