import { ObjectId } from 'bson';

export const availableAgentSorts = ['createdAt', 'updatedAt', 'memberLikes', 'memberViews', 'memberRank'];
export const availableMemberSorts = ['createdAt', 'updatedAt', 'memberLikes', 'memberViews'];
export const availableOptions = ["propertyBarter", "propertyRent"];
export const availablePropertySorts = [
	'createdAt',
	'updatedAt',
	'propertyLikes',
	'propertyViews',
	'propertyRank',
	'propertyPrice'
];


export const availableCommentSorts = ['createdAt', 'updatedAt'];


 // IMAGE CONFIGURATION
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { T } from './types/common';

export const validMimeTypes = ['image/png', 'image/jpg', 'image/jpeg'];
export const getSerialForImage = (filename: string) => {
	const ext = path.parse(filename).ext;
	return uuidv4() + ext;
};


export const shapeIntoMongoObjectId = (target: any) => {
     return typeof target === 'string' ? new ObjectId(target) : target 
};


export const lookupAuthMemberLiked = (memberId: T | null, targetRefId: string = "$_id") => {
	//  "$_id" = propertyModeldan memberimizni idsi ga teng agar u propertyModeldan kelmasa default oi qoyib ketadi
	return {
		$lookup: {
			from: "likes",  // likes collectiondan letdagi properties larni qidiryapmiz
			let: { // local variablelar
				localLikeRefId: targetRefId, // property Id si [member1, member2, member3]
				localMemberId: memberId,  // memberID si.      [Khoji]
				localMyFavorite: true, // ozimiz u/n qiymat yaratib true deb oldik
			},
			pipeline: [
				{
					$match: { // solishtirish
						$expr: { // bir nechta narsani solishtirish uchun expressiondan foydalanyapmiz
							$and: [{$eq: ['$likeRefId', '$$localLikeRefId']}, { $eq: ['$memberId', '$$localMemberId'] }],
							// @and => like bosgan user b/n   login bolgan userni solishtiradi
							// $$ -> local variablelear doim $$ bilan yoziladi
						}
					}
				},
				{
					$project: { // projectda tepadan olingan malumotlarni olib beradi
						_id: 0, // default 1 ni oladi
						memberId: 1, // olyapmiz
						likeRefId: 1,
						myFavorite: '$$localMyFavorite',
					}
				}
			],
			as: 'meLiked'
		}
	}
}


interface LookupAuthMemberFollowed {
	followerId: T | null;
	followingId: string;
}

export const lookupAuthMemberFollowed = (input: LookupAuthMemberFollowed) => {
	const { followerId, followingId } = input;
	return {
		$lookup: {
			from: "follows",
			let: {
				localFollowerId: followerId, 
				localFollowingId: followingId,
				localMyFavorite: true,
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$and: [{$eq: ['$followerId', '$$localFollowerId']}, { $eq: ['$followingId', '$$localFollowingId'] }],
						}
					}
				},
				{
					$project: {
						_id: 0,
						followerId: 1,
						followingId: 1,
						myFollowing: '$$localMyFavorite',
					}
				}
			],
			as: 'meFollowed'
		}
	}
}




/*
 * lookupMember / lookupFollowingData / lookupFollowerData / lookupFavorite / lookupVisit were removed:
 * members, properties, likes and views now live in different services (and databases),
 * so a MongoDB $lookup across them is no longer possible. Services fetch that data over RPC instead
 * (see member.byIds and property.byIds).
 */
