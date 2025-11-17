// eslint-disable-next-line import/extensions
import { getGlobals } from '../globals.js';

export default class Card {
  constructor(code, id) {
    const {
      cardCodeDB, settings, IMAGE_BASE_DIR, THRONESDB_CARD_DIR,
    } = getGlobals();

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

    // Default to primary source if not set
    if (!this.scanSource) {
      [this.scanSource] = this.sourcePriorities;
    }

    this.usingPrimarySource = this.scanSource === this.sourcePriorities[0];
    this.IMAGE_BASE_DIR = IMAGE_BASE_DIR;
    this.THRONESDB_CARD_DIR = THRONESDB_CARD_DIR;
    this.cardCodeDB = cardCodeDB;
    this.settings = settings;
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
    this.cardFromDB = this.cardCodeDB[this.code];
    this.usingPrimarySource = this.scanSource === this.sourcePriorities[0];
    this.setPreviews();
    document.getElementById(`previewCard${this.id}`).src = `${this.IMAGE_BASE_DIR}${this.frontPrev}`;

    if (this.backPrev !== '' && this.settings.includeCardBacks === 'true') {
      document.getElementById(`previewCardBack${this.id}`).style.display = '';
      document.getElementById(`previewCardBackImg${this.id}`).src = `${this.IMAGE_BASE_DIR}${this.backPrev}`;
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
    newHtml += `<a href="${this.THRONESDB_CARD_DIR}${this.code}" title="" target="NetrunnerCard">`;
    newHtml += `<img class="${imgClass}" id="previewCard${this.id}" src="${frontImgURL}" alt="${this.code}" />`;
    newHtml += `<span class="label">${this.code} ${this.title}</span>`;
    newHtml += '</a>';

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
      const altCard = this.cardCodeDB[altArt.code];
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

  getAltArtSelectorEvents(cardManager) {
    return {
      right: () => cardManager.cycleCardAltArt(this.id),
      left: () => cardManager.cycleCardAltArt(this.id, false),
      select: (e) => cardManager.setCardCode(this.id, e.target.value),
    };
  }
}

