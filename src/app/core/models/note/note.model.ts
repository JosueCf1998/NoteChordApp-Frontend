import { Timestamp } from 'firebase/firestore';

export interface Note {
  id: string;
  userId: string;
  folderId: string;
  title: string;
  content: string;
  author?: string;
  type?: 'music' | 'standard';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

