import { describe, it, expect } from 'vitest';
import { adaptCardListToCardTitleDB, adaptCardListToCardCodeDB, adaptCardListToPackList } from '../../../public/js/adaptors';

const thronesApiFormattedInput = [
  {
    pack_code: 'VDS',
    pack_name: 'Valyrian Draft Set',
    type_code: 'agenda',
    code: '00001',
    name: 'The Power of Wealth',
    illustrator: 'David Griffith',
    image_url: 'https://throneteki.ams3.cdn.digitaloceanspaces.com/packs/VDS/00001.png',
    errataed: false,
    url: 'https://thronesdb.com/card/00001',
    label: 'The Power of Wealth',
  },
  {
    pack_code: 'Core',
    pack_name: 'Core Set',
    type_code: 'character',
    code: '01031',
    name: 'Wildling Horde',
    illustrator: 'Ryan Barger',
    image_url: 'https://lcg-cdn.fantasyflightgames.com/got2nd/GT01_31.jpg',
    errataed: false,
    url: 'https://thronesdb.com/card/01031',
    label: 'Wildling Horde',
  },
  {
    pack_code: 'Core',
    pack_name: 'Core Set',
    type_code: 'attachment',
    code: '01032',
    name: 'Seal of the Hand',
    illustrator: 'Mauro Dal Bo',
    image_url: 'https://lcg-cdn.fantasyflightgames.com/got2nd/GT01_32.jpg',
    errataed: false,
    url: 'https://thronesdb.com/card/01032',
    label: 'Seal of the Hand',
  },
  {
    pack_code: 'Core',
    pack_name: 'Core Set',
    type_code: 'attachment',
    code: '01033',
    name: 'Bodyguard',
    illustrator: 'J. Edwin Stevens',
    image_url: 'https://lcg-cdn.fantasyflightgames.com/got2nd/GT01_33.jpg',
    errataed: false,
    url: 'https://thronesdb.com/card/01033',
    label: 'Bodyguard',
  },
  {
    pack_code: 'Core',
    pack_name: 'Core Set',
    type_code: 'attachment',
    code: '01034',
    name: 'Little Bird',
    illustrator: 'Melissa Findley',
    image_url: 'https://lcg-cdn.fantasyflightgames.com/got2nd/GT01_34.jpg',
    errataed: false,
    url: 'https://thronesdb.com/card/01034',
    label: 'Little Bird (Core)',
  },
  {
    pack_code: 'Core',
    pack_name: 'Core Set',
    type_code: 'attachment',
    code: '01035',
    name: 'Milk of the Poppy',
    illustrator: 'Kara Williams',
    image_url: 'https://lcg-cdn.fantasyflightgames.com/got2nd/GT01_35.jpg',
    errataed: false,
    url: 'https://thronesdb.com/card/01035',
    label: 'Milk of the Poppy',
  },
];

describe('adaptCardListToCardTitleDB', () => {
  it('should adapt the card list to the expected format', () => {
    const expectedOutput = {
      'The Power of Wealth': {
        codes: ['00001'],
        title: 'The Power of Wealth',
        label: 'The Power of Wealth',
      },
      'Wildling Horde': {
        codes: ['01031'],
        title: 'Wildling Horde',
        label: 'Wildling Horde',
      },
      'Seal of the Hand': {
        codes: ['01032'],
        title: 'Seal of the Hand',
        label: 'Seal of the Hand',
      },
      Bodyguard: {
        codes: ['01033'],
        title: 'Bodyguard',
        label: 'Bodyguard',
      },
      'Little Bird (Core)': {
        codes: ['01034'],
        title: 'Little Bird',
        label: 'Little Bird (Core)',
      },
      'Milk of the Poppy': {
        codes: ['01035'],
        title: 'Milk of the Poppy',
        label: 'Milk of the Poppy',
      },
    };

    const result = adaptCardListToCardTitleDB(thronesApiFormattedInput);
    expect(result).toEqual(expectedOutput);
  });
});

describe('adaptCardListToCardCodeDB', () => {
  it('should adapt the card list to the expected format', () => {
    const expectedOutput = {
      '00001': {
        code: '00001',
        title: 'The Power of Wealth',
        label: 'The Power of Wealth',
        type_code: 'agenda',
        pack_code: 'VDS',
        pack_name: 'Valyrian Draft Set',
        image_url: 'https://throneteki.ams3.cdn.digitaloceanspaces.com/packs/VDS/00001.png',
        url: 'https://thronesdb.com/card/00001',
      },
      '01031': {
        code: '01031',
        title: 'Wildling Horde',
        label: 'Wildling Horde',
        type_code: 'character',
        pack_code: 'Core',
        pack_name: 'Core Set',
        image_url: 'https://lcg-cdn.fantasyflightgames.com/got2nd/GT01_31.jpg',
        url: 'https://thronesdb.com/card/01031',
      },
      '01032': {
        code: '01032',
        title: 'Seal of the Hand',
        label: 'Seal of the Hand',
        type_code: 'attachment',
        pack_code: 'Core',
        pack_name: 'Core Set',
        image_url: 'https://lcg-cdn.fantasyflightgames.com/got2nd/GT01_32.jpg',
        url: 'https://thronesdb.com/card/01032',
      },
      '01033': {
        code: '01033',
        title: 'Bodyguard',
        label: 'Bodyguard',
        type_code: 'attachment',
        pack_code: 'Core',
        pack_name: 'Core Set',
        image_url: 'https://lcg-cdn.fantasyflightgames.com/got2nd/GT01_33.jpg',
        url: 'https://thronesdb.com/card/01033',
      },
      '01034': {
        code: '01034',
        title: 'Little Bird',
        label: 'Little Bird (Core)',
        type_code: 'attachment',
        pack_code: 'Core',
        pack_name: 'Core Set',
        image_url: 'https://lcg-cdn.fantasyflightgames.com/got2nd/GT01_34.jpg',
        url: 'https://thronesdb.com/card/01034',
      },
      '01035': {
        code: '01035',
        title: 'Milk of the Poppy',
        label: 'Milk of the Poppy',
        type_code: 'attachment',
        pack_code: 'Core',
        pack_name: 'Core Set',
        image_url: 'https://lcg-cdn.fantasyflightgames.com/got2nd/GT01_35.jpg',
        url: 'https://thronesdb.com/card/01035',
      },
    };

    const result = adaptCardListToCardCodeDB(thronesApiFormattedInput);
    expect(result).toEqual(expectedOutput);
  });
});

describe('adaptCardListToPackList', () => {
  it('should adapt the card list to the expected format', () => {
    const expectedOutput = [
      {
        pack_code: 'VDS',
        name: 'Valyrian Draft Set',
        is_core: false,
      },
      {
        pack_code: 'Core',
        name: 'Core Set',
        is_core: true,
      },
    ];

    const result = adaptCardListToPackList(thronesApiFormattedInput);
    expect(result).toEqual(expectedOutput);
  });
});
