// eslint-disable-next-line import/extensions
import Card from './Card.js';
// eslint-disable-next-line import/extensions
import { getGlobals } from '../globals.js';
// eslint-disable-next-line import/extensions
import { fetchJson } from '../helpers.js';

export default class CardManager {
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
  }

  updateCardListFromTextArea(cardListText) {
    const { cardTitleDB, cardCodeDB } = getGlobals();

    const input = cardListText.split(/\n/).filter((e) => (e !== ''));
    const cardInputRegex = /([0-9] |[0-9]x )?(.*)/;
    const cardTitles = Object.values(this.cards).map((c) => c.title);
    const newCardTitles = [];
    const unfoundCards = [];
    let unfoundCount = 0;

    input.forEach((entry) => {
      const match = cardInputRegex.exec(entry);
      const count = (match[1] === undefined) ? 1 : parseInt(match[1], 10);
      const cardKey = match[2];

      // This will remove any parenthetical text at the end of the card title
      // This is necessary because the ThronesDB export includes the set code in the exported text
      const strippedCardKey = cardKey.replace(/\s*\([^)]*\)\s*$/, '').trim();

      if (cardKey in cardTitleDB) {
        for (let i = 0; i < count; i += 1) {
          const cardTitle = cardTitleDB[cardKey].label;
          newCardTitles.push(cardTitle);
        }
      } else if (strippedCardKey in cardTitleDB) {
        // This check catches cases where the user has included the set code in parentheses
        // For example for ThronesDB copy/paste: "A Noble Cause (Core)" should match "A Noble Cause"
        for (let i = 0; i < count; i += 1) {
          const cardTitle = cardTitleDB[strippedCardKey].label;
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
    const { cardCodeDB, packList } = getGlobals();

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
    const { THRONESDB_API_DIR } = getGlobals();

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
      fetchJson(`${THRONESDB_API_DIR}${apiOption}${deckId}`)
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
      url: this.cards[id].frontPrev,
      isPlot: this.cards[id].typeCode === 'plot',
      // source: this.cards[id].scanSource,
      // side: this.cards[id].side,
    }));
  }
}

