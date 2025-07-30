export function adaptCardListToCardTitleDB(cardList) {
  const adapted = {};

  cardList.forEach((card) => {
    adapted[`${card.label}`] = {
      codes: [card.code],
      title: card.name,
      label: card.label,
    };
  });

  return adapted;
}

export function adaptCardListToCardCodeDB(cardList) {
  const adapted = {};

  cardList.forEach((card) => {
    adapted[`${card.code}`] = {
      code: card.code,
      title: card.name,
      label: card.label,
      pack_code: card.pack_code,
      pack_name: card.pack_name,
      type_code: card.type_code,
      image_url: card.image_url,
      url: card.url,
    };
  });

  return adapted;
}

export function adaptCardListToPackList(cardList) {
  const adapted = { packList: {} };

  cardList.forEach((card) => {
    if (!adapted.packList[`${card.pack_code}`]) {
      adapted.packList[`${card.pack_code}`] = {
        name: card.pack_name,
        pack_code: card.pack_code,
        is_core: card.pack_code === 'Core',
      };
    }
  });

  const packListValues = Object.values(adapted.packList);

  return packListValues;
}

export default { adaptCardListToCardTitleDB, adaptCardListToCardCodeDB, adaptCardListToPackList };
