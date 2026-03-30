import React from 'react';
import { getFullFileUrl, getInitials, getAvatarColor } from '../utils/helpers';

interface StoryItem {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
}

interface SoftStoriesProps {
  stories: StoryItem[];
}

const SoftStories: React.FC<SoftStoriesProps> = ({ stories }) => {
  if (!stories || stories.length === 0) return null;

  return (
    <div className="flex items-center space-x-4 overflow-x-auto scrollbar-hide py-1 px-1">
      {stories.map((story) => {
        const url = getFullFileUrl(story.avatar);
        return (
          <div key={story.id} className="flex flex-col items-center space-y-1.5 flex-shrink-0 cursor-pointer">
            {/* Avatar with white ring (story-style) */}
            <div className="relative story-ring rounded-full">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold overflow-hidden">
                {url ? (
                  <img src={url} className="w-full h-full object-cover rounded-full" alt="" />
                ) : (
                  <div className={`w-full h-full rounded-full bg-gradient-to-tr ${getAvatarColor(story.name)} flex items-center justify-center text-white text-base font-bold`}>
                    {getInitials(story.name)}
                  </div>
                )}
              </div>
              {/* Online dot */}
              {story.isOnline && (
                <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-400 border-2 border-soft-primary rounded-full shadow-sm" />
              )}
            </div>
            <p className="text-[10px] font-semibold text-white/80 truncate w-12 text-center">
              {story.name.split(' ')[0]}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(SoftStories);
