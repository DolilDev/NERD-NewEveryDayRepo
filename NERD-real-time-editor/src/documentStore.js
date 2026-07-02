class DocumentStore {
  constructor() {
    this.documents = new Map();
    this.histories = new Map();
    this.versions = new Map();
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
    const v = (this.versions.get(id) || 0) + 1;
    this.versions.set(id, v);
    return v;
  }

  getVersion(id = 'main') {
    return this.versions.get(id) || 0;
  }

  // Attempt to set document only if expectedVersion matches current.
  setDocumentIfVersion(id = 'main', content, expectedVersion) {
    const current = this.getVersion(id);
    if (typeof expectedVersion === 'number' && expectedVersion !== current) {
      throw new Error('version-mismatch');
    }
    return this.setDocument(id, content);
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
