const globals = {
  cardTitleDB: null,
  cardCodeDB: null,
  packList: null,
  settings: null,
  IMAGE_BASE_DIR: 'https://proxynexus.blob.core.windows.net/version2/',
  THRONESDB_API_DIR: 'https://thronesdb.com/api/2.0/public/',
  THRONESDB_CARD_DIR: 'https://thronesdb.com/card/',
};

export function setGlobals(updates) {
  Object.assign(globals, updates);
}

export function getGlobals() {
  return globals;
}
