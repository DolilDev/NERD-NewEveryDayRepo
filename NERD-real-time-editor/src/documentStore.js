class DocumentStore {
  constructor() {
    this.documents = new Map();
    this.histories = new Map();
    this.defaultDocument = 'Welcome to NERD collaborative editing.';
    this.initDocument();
  }

  initDocument() {
    this.setDocument('main', this.defaultDocument);
  }

  getDocument(id = 'main') {
    return this.documents.get(id) || this.defaultDocument;
  }

  setDocument(id = 'main', content) {
    this.documents.set(id, content);
    const history = this.histories.get(id) || [];
    this.histories.set(id, [...history, content]);
  }

  getHistory(id = 'main') {
    return this.histories.get(id) || [this.defaultDocument];
  }

  revertToVersion(id = 'main', versionIndex) {
    const history = this.getHistory(id);
    if (versionIndex < 0 || versionIndex >= history.length) {
      throw new Error('Invalid version index');
    }

    const content = history[versionIndex];
    this.documents.set(id, content);
    return content;
  }
}

module.exports = DocumentStore;
