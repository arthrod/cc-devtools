import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Modal } from '../common/Modal';
import { MarkdownContent } from '../shared/MarkdownContent';
import type { StoryReviewFeedback } from '../../../../kanban/types';

interface ReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: string;
  reviews: StoryReviewFeedback[];
}

interface GroupedReview {
  round: number;
  reviewer: string;
  review: string;
  timestamp: string;
}

export function ReviewsModal({
  isOpen,
  onClose,
  storyId,
  reviews,
}: ReviewsModalProps): JSX.Element {
  const groupedReviews: GroupedReview[] = reviews
    .sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      return a.reviewer.localeCompare(b.reviewer);
    })
    .map((r) => ({
      round: r.round,
      reviewer: r.reviewer,
      review: r.review,
      timestamp: r.timestamp,
    }));

  const [expandedReviews, setExpandedReviews] = useState<Record<string, boolean>>(
    Object.fromEntries(groupedReviews.map((_, index) => [index.toString(), true]))
  );

  const toggleReview = (index: number): void => {
    setExpandedReviews(prev => ({
      ...prev,
      [index.toString()]: !prev[index.toString()],
    }));
  };

  const capitalizeReviewer = (reviewer: string): string => {
    return reviewer.charAt(0).toUpperCase() + reviewer.slice(1);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reviews for ${storyId}`}
      closeOnEscape={true}
      closeOnOverlayClick={true}
    >
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        {groupedReviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No reviews found for this story.
          </div>
        ) : (
          groupedReviews.map((review, index) => {
            const isExpanded = expandedReviews[index.toString()] ?? true;
            return (
              <div
                key={`${review.round}-${review.reviewer}-${index}`}
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleReview(index)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Round {review.round}
                    </h3>
                    <span className="text-gray-500 dark:text-gray-400">-</span>
                    <span className="text-md font-medium text-blue-600 dark:text-blue-400">
                      {capitalizeReviewer(review.reviewer)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(review.timestamp).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <MarkdownContent content={review.review} scrollable={false} />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
