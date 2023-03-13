import urlcat from 'urlcat'
import { fetchJSON } from '../../helpers'
import type { TwitterBaseAPI } from '../../types'

export async function getUserNFTAvatar(screenName: string) {
    const url = urlcat('https://yb0w3z63oa.execute-api.us-east-1.amazonaws.com/prod/twitter-nft-avatar', { screenName })
    return fetchJSON<TwitterBaseAPI.UserNFTAvatarResponse>(url)
}