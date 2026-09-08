import { Timestamp } from 'firebase/firestore';

export interface Note {
  id: string;
  userId: string;
  folderId: string;
  title: string;
  content: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
