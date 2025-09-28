import type { Channel, LineItem } from './schemas';

type ExtensionKey = Extract<keyof LineItem, `${string}_ext`>;

export const extensionKeyByChannel: Partial<Record<Channel, ExtensionKey>> = {
  OOH: 'ooh_ext',
  TV: 'tv_ext',
  BVOD_CTV: 'bvod_ext',
  Digital_Display: 'digital_ext',
  Digital_Video: 'digital_ext',
  Social: 'social_ext',
  Search: 'search_ext',
  Radio: 'audio_ext',
  Streaming_Audio: 'audio_ext',
  Podcast: 'podcast_ext',
  Cinema: 'cinema_ext',
  Print: 'print_ext',
  Retail_Media: 'retail_media_ext',
  Influencer: 'influencer_ext',
  Sponsorship: 'sponsorship_ext',
  Email: 'email_dm_ext',
  Direct_Mail: 'email_dm_ext',
  Gaming: 'gaming_native_ext',
  Native: 'gaming_native_ext',
  Affiliate: 'affiliate_ext',
  Experiential: 'sponsorship_ext',
};

export function getChannelExtension(lineItem: LineItem) {
  const key = extensionKeyByChannel[lineItem.channel];
  if (!key) return undefined;
  return lineItem[key];
}
