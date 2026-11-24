import { Types } from 'mongoose';
import { shapeIntoMongoObjectId } from '../config';

/** Mongoose document -> plain object, so extra fields (accessToken, memberData, meLiked…) survive JSON over TCP. */
export const plain = <T = any>(doc: any): T => (doc && typeof doc.toObject === 'function' ? doc.toObject() : doc);

/** Ids arrive over TCP as strings; aggregation $match needs real ObjectIds. */
export const toObjectId = (id: any): Types.ObjectId | null => (id ? shapeIntoMongoObjectId(id) : null);

export const idOf = (value: any): string => String(value ?? '');
