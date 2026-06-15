import { ObjectId, type WithoutId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import type { AppState } from '@/types';

const COLLECTION = 'users';

export interface UserDoc {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  data: AppState;
  createdAt: Date;
  updatedAt: Date;
}

type UserInsert = WithoutId<UserDoc>;

let indexesReady: Promise<void> | null = null;

function ensureIndexes(): Promise<void> {
  if (!indexesReady) {
    indexesReady = getDb().then(async db => {
      await db.collection(COLLECTION).createIndex({ email: 1 }, { unique: true });
    });
  }
  return indexesReady;
}

async function getUsersCollection() {
  await ensureIndexes();
  const db = await getDb();
  return db.collection<UserDoc>(COLLECTION);
}

export async function findUserByEmail(email: string): Promise<UserDoc | null> {
  const col = await getUsersCollection();
  return col.findOne({ email });
}

export async function findUserById(id: string): Promise<UserDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await getUsersCollection();
  return col.findOne({ _id: new ObjectId(id) });
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  name: string;
  data: AppState;
}): Promise<string> {
  const now = new Date();
  const col = await getUsersCollection();
  const doc: UserInsert = {
    email: input.email,
    passwordHash: input.passwordHash,
    name: input.name,
    data: input.data,
    createdAt: now,
    updatedAt: now,
  };
  const result = await col.insertOne(doc as UserDoc);
  return result.insertedId.toString();
}

export async function getUserData(userId: string): Promise<AppState | null> {
  const user = await findUserById(userId);
  return user?.data ?? null;
}

export async function saveUserData(userId: string, data: AppState): Promise<void> {
  if (!ObjectId.isValid(userId)) throw new Error('Invalid user id');
  const col = await getUsersCollection();
  await col.updateOne(
    { _id: new ObjectId(userId) },
    { $set: { data, updatedAt: new Date() } }
  );
}
