import {
  describe, it, expect, beforeEach, vi,
} from 'vitest';
import { JSDOM } from 'jsdom';
import Card from '../../../public/js/cards/Card';
import CardManager from '../../../public/js/cards/CardManager';
import { setGlobals } from '../../../public/js/globals';

// Mock the helpers module
vi.mock('../../../public/js/helpers', () => (
  {
    loadSettings: vi.fn((callback) => {
      callback();
      return { scanSourcePriority: 'pt', includeCardBacks: 'false' };
    }),
    fetchJson: vi.fn(),
  }
));

// Mock the adaptors module
vi.mock('../../../public/js/adaptors', () => (
  {
    adaptCardListToCardTitleDB: vi.fn(),
    adaptCardListToCardCodeDB: vi.fn(),
    adaptCardListToPackList: vi.fn(),
  }
));

describe('Card rendering', () => {
  let dom;

  beforeEach(async () => {
    // Set up a DOM environment
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="cardPreview"></div><div id="altArtSelector"></div></body></html>');
    const { document, window } = dom.window;
    global.document = document;
    global.window = window;

    // Mock card database
    const cardCodeDB = {
      '01001': {
        code: '01001',
        title: 'Eddard Stark',
        label: 'Eddard Stark',
        type_code: 'character',
        pack_code: 'Core',
        pack_name: 'Core Set',
        image_url: 'https://example.com/01001.jpg',
      },
      '01002': {
        code: '01002',
        title: 'Catelyn Stark',
        label: 'Catelyn Stark',
        type_code: 'character',
        pack_code: 'Core',
        pack_name: 'Core Set',
        image_url: 'https://example.com/01002.jpg',
      },
      '01003': {
        code: '01003',
        title: 'A Game of Thrones',
        label: 'A Game of Thrones',
        type_code: 'plot',
        pack_code: 'Core',
        pack_name: 'Core Set',
        image_url: 'https://example.com/01003.jpg',
      },
    };

    // Set up globals needed by the Card and CardManager classes
    setGlobals({
      cardCodeDB,
      cardTitleDB: {},
      packList: [],
      settings: { scanSourcePriority: 'pt', includeCardBacks: 'false' },
    });
  });

  it('should render a single card with the correct ThronesDB link', () => {
    const card = new Card('01001', 1);
    const html = card.getPreviewHTML();

    expect(html).toContain('href="https://thronesdb.com/card/01001"');
    expect(html).toContain('Eddard Stark');
    expect(html).toContain('01001');
  });

  it('should render multiple cards with correct ThronesDB links', () => {
    const cardManager = new CardManager();

    cardManager.addCard('01001', 0);
    cardManager.addCard('01002', 1);

    cardManager.buildCardHTML();

    const renderedHTML = cardManager.cardPreview.innerHTML;

    // Check that both cards are rendered
    expect(renderedHTML).toContain('href="https://thronesdb.com/card/01001"');
    expect(renderedHTML).toContain('href="https://thronesdb.com/card/01002"');
    expect(renderedHTML).toContain('Eddard Stark');
    expect(renderedHTML).toContain('Catelyn Stark');
  });

  it('should apply rotateLeft class to plot cards', () => {
    const card = new Card('01003', 1);
    const html = card.getPreviewHTML();

    expect(html).toContain('class="card rotateLeft"');
    expect(html).toContain('A Game of Thrones');
  });

  it('should render correct number of link elements for all cards in the list', () => {
    const cardManager = new CardManager();

    // Add all three test cards
    cardManager.addCard('01001', 0);
    cardManager.addCard('01002', 1);
    cardManager.addCard('01003', 2);

    cardManager.buildCardHTML();

    const renderedHTML = cardManager.cardPreview.innerHTML;

    // Count the number of ThronesDB links
    const linkMatches = renderedHTML.match(/href="https:\/\/thronesdb\.com\/card\/\d+"/g);
    expect(linkMatches).toHaveLength(3);

    // Verify each specific card link exists
    expect(renderedHTML).toContain('href="https://thronesdb.com/card/01001"');
    expect(renderedHTML).toContain('href="https://thronesdb.com/card/01002"');
    expect(renderedHTML).toContain('href="https://thronesdb.com/card/01003"');
  });

  it('should include card code and title in each rendered card', () => {
    const cardManager = new CardManager();

    cardManager.addCard('01001', 0);
    cardManager.addCard('01002', 1);

    cardManager.buildCardHTML();

    const renderedHTML = cardManager.cardPreview.innerHTML;

    // Check that each card has its code and title in a label
    expect(renderedHTML).toContain('<span class="label">01001 Eddard Stark</span>');
    expect(renderedHTML).toContain('<span class="label">01002 Catelyn Stark</span>');
  });

  it('should return correct card list data', () => {
    const cardManager = new CardManager();

    cardManager.addCard('01001', 0);
    cardManager.addCard('01002', 1);
    cardManager.addCard('01003', 2);

    const cardList = cardManager.getCardList();

    expect(cardList).toHaveLength(3);
    expect(cardList[0]).toEqual({
      code: '01001',
      url: 'https://example.com/01001.jpg',
      isPlot: false,
    });
    expect(cardList[1]).toEqual({
      code: '01002',
      url: 'https://example.com/01002.jpg',
      isPlot: false,
    });
    expect(cardList[2]).toEqual({
      code: '01003',
      url: 'https://example.com/01003.jpg',
      isPlot: true,
    });
  });
});
