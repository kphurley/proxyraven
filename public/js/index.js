// eslint-disable-next-line import/extensions
import { loadSettings, fetchJson } from './helpers.js';

// eslint-disable-next-line import/extensions
import { adaptCardListToCardTitleDB, adaptCardListToCardCodeDB, adaptCardListToPackList } from './adaptors.js';

// eslint-disable-next-line import/extensions
import CardManager from './cards/CardManager.js';

// eslint-disable-next-line import/extensions
import { setGlobals, getGlobals } from './globals.js';

let cardListTextArea;
let setSelection;
let deckURLText;
let cardManager;
let sessionID = 0;
let playsetSelection;
let selectedTab = 'Card List';
let isGeneratingProxies = false;

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

function loadStoredSelections() {
  const { cardTitleDB, cardCodeDB } = getGlobals();

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
  const { packList } = getGlobals();

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
      const cardTitleDB = adaptCardListToCardTitleDB(thronesCards);
      const cardCodeDB = adaptCardListToCardCodeDB(thronesCards);
      const packList = adaptCardListToPackList(thronesCards);

      setGlobals({ cardTitleDB, cardCodeDB, packList });

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
      const { settings } = getGlobals();
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
        includeCardBacks: false,
        // includeCardBacks: (settings.includeCardBacks === 'true'),
      };
      postData('/api/generate', generateSettings)
        .then(() => {
          isGeneratingProxies = true;
          document.getElementById('progressBarDiv').style.opacity = '1';
          document.getElementById('generateBtn').disabled = true;
          document.getElementById('progressBar').display = 'block';
          document.getElementById('issueMsg').style.display = 'block';
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

  const settings = loadSettings(() => {
    // eslint-disable-next-line no-undef
    const welcomeModal = new bootstrap.Modal(document.getElementById('welcomeModal'), {});
    welcomeModal.show();
  });
  setGlobals({ settings });
  assignEvents();
  loadOptions();
});
