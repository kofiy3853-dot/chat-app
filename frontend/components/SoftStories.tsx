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
  return (
    <div className="flex items-center space-x-4 overflow-x-auto scrollbar-hide py-4 px-1 min-w-0">
      {stories.map((story) => (
        <div key={story.id} className="flex flex-col items-center space-y-1.5 flex-shrink-0">
          <div className="relative p-0.5 rounded-full border-2 border-transparent group-hover:border-soft-primary">
            <div className={`w-14 h-14 rounded-full bg-gradient-to-tr ${getAvatarColor(story.name)} flex items-center justify-center text-white text-lg font-bold shadow-soft overflow-hidden`}>
              {(() => {
                const url = getFullFileUrl(story.avatar);
                return url ? (
                  <img src={url} className="w-full h-full object-cover" alt="" />
                ) : (
                  getInitials(story.name)
                );
              })()}
            </div>
            {story.isOnline && (
              <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm"></span>
            )}
          </div>
          <p className="text-[10px] font-bold text-soft-text-secondary truncate w-14 text-center">
            {story.name.split(' ')[0]}
          </p>
        </div>
      ))}
    </div>
  );
};

export default React.memo(SoftStories);
