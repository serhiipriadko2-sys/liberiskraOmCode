import { MemoryNode, MemoryNodeType } from '../types';

const ARCHIVE_KEY = 'iskra-space-archive';
const SHADOW_KEY = 'iskra-space-shadow';

const generateId = (prefix: string): string => {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:.]/g, '').slice(0, -4);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
}

const sanitizeHtml = (text: string): string => {
  const element = document.createElement('div');
  element.innerText = text;
  return element.innerHTML;
}


export const memoryService = {
  // ARCHIVE
  getArchive(): MemoryNode[] {
    try {
      const archiveJson = localStorage.getItem(ARCHIVE_KEY);
      const nodes: MemoryNode[] = archiveJson ? JSON.parse(archiveJson) : [];
      return nodes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error("Error reading archive from localStorage", error);
      return [];
    }
  },

  addArchiveEntry(partialNode: Partial<MemoryNode>): MemoryNode {
    const fullNode: MemoryNode = {
        id: generateId('ARC'),
        timestamp: new Date().toISOString(),
        layer: 'archive',
        type: 'insight', // default
        title: 'Untitled Node',
        content: {},
        evidence: [],
        tags: [],
        ...partialNode,
    };

    try {
      const archive = this.getArchive();
      const updatedArchive = [fullNode, ...archive];
      localStorage.setItem(ARCHIVE_KEY, JSON.stringify(updatedArchive));
    } catch (error) {
      console.error("Error adding to archive in localStorage", error);
    }
    return fullNode;
  },

  // SHADOW
  getShadow(): MemoryNode[] {
    try {
      const shadowJson = localStorage.getItem(SHADOW_KEY);
      const nodes: MemoryNode[] = shadowJson ? JSON.parse(shadowJson) : [];
      return nodes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error("Error reading shadow from localStorage", error);
      return [];
    }
  },

  addShadowEntry(partialNode: Partial<MemoryNode>): MemoryNode {
    const fullNode: MemoryNode = {
        id: generateId('SHD'),
        timestamp: new Date().toISOString(),
        layer: 'shadow',
        type: 'event', // default
        title: 'Untitled Shadow Node',
        content: {},
        evidence: [],
        tags: [],
        ...partialNode,
    };
    
    try {
      const shadow = this.getShadow();
      const updatedShadow = [fullNode, ...shadow];
      localStorage.setItem(SHADOW_KEY, JSON.stringify(updatedShadow));
    } catch (error) {
      console.error("Error adding to shadow in localStorage", error);
    }
    return fullNode;
  },

  // Basic sanitization to prevent simple injection attacks from memory content
  sanitize(content: any): string {
    if (typeof content === 'string') {
        return sanitizeHtml(content);
    }
    if (typeof content === 'object' && content !== null) {
        try {
            return sanitizeHtml(JSON.stringify(content, null, 2));
        } catch {
            return '[Unserializable Content]';
        }
    }
    return String(content);
  }
};
