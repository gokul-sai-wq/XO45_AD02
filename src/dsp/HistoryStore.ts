/**
 * SoundBridge Transmission History Store
 * Tracks all outbound acoustic broadcasts and inbound decoded receptions.
 */

export interface TransmissionRecord {
  id: string;
  type: 'sent' | 'received';
  payload: string;
  timestamp: string;
  frequencyBand: string;
  crcHex: string;
  crcValid: boolean;
  ackStatus: 'confirmed' | 'pending';
  snrDb?: number;
}

type Listener = () => void;

class HistoryStoreManager {
  private records: TransmissionRecord[] = [];

  private listeners: Listener[] = [];

  public getRecords(): TransmissionRecord[] {
    return [...this.records];
  }

  public addRecord(record: Omit<TransmissionRecord, 'id' | 'timestamp'>): void {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newEntry: TransmissionRecord = {
      ...record,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: `Today, ${timeStr}`,
    };

    this.records = [newEntry, ...this.records];
    this.notify();
  }

  public clearHistory(): void {
    this.records = [];
    this.notify();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}

export const HistoryStore = new HistoryStoreManager();
