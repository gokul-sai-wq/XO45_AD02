/**
 * SoundBridge Transmission History Store
 * Tracks all outbound acoustic broadcasts and inbound decoded receptions.
 */

export interface TransmissionRecord {
  id: string;
  type: 'sent' | 'received';
  payload: string;
  timestamp: string;
  frequencyBand: 'Audible (2.2 kHz)' | 'Ultrasonic (18.5 kHz)';
  crcHex: string;
  crcValid: boolean;
  ackStatus: 'confirmed' | 'pending';
  snrDb?: number;
}

type Listener = () => void;

class HistoryStoreManager {
  private records: TransmissionRecord[] = [
    {
      id: 'init-1',
      type: 'received',
      payload: 'https://exam.hall.local/session-hall-402',
      timestamp: 'Today, 2:30 PM',
      frequencyBand: 'Audible (2.2 kHz)',
      crcHex: '0x9AF2',
      crcValid: true,
      ackStatus: 'confirmed',
      snrDb: 26,
    },
    {
      id: 'init-2',
      type: 'sent',
      payload: 'https://exam.hall.local/paper-b',
      timestamp: 'Today, 1:15 PM',
      frequencyBand: 'Audible (2.2 kHz)',
      crcHex: '0x3E1C',
      crcValid: true,
      ackStatus: 'confirmed',
      snrDb: 28,
    },
    {
      id: 'init-3',
      type: 'sent',
      payload: 'WIFI:Pass12345',
      timestamp: 'Yesterday, 4:45 PM',
      frequencyBand: 'Ultrasonic (18.5 kHz)',
      crcHex: '0x8B44',
      crcValid: true,
      ackStatus: 'confirmed',
      snrDb: 22,
    },
  ];

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
