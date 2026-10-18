import React, { useState } from 'react';
import { MessageSquare, Check, X, Send, CornerDownRight } from 'lucide-react';

export interface CommentItem {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  elementId?: string | null;
  x: number;
  y: number;
  text: string;
  parentId?: string | null;
  isResolved: boolean;
  createdAt: string;
}

interface CommentsLayerProps {
  stagePos: { x: number; y: number };
  stageScale: number;
  comments: CommentItem[];
  isCommentToolActive: boolean;
  newCommentDraft?: { x: number; y: number } | null;
  onCancelNewComment?: () => void;
  onAddComment: (text: string, x: number, y: number, parentId?: string | null) => void;
  onResolveComment: (commentId: string, isResolved: boolean) => void;
  onDeleteComment: (commentId: string) => void;
}

export const CommentsLayer: React.FC<CommentsLayerProps> = ({
  stagePos,
  stageScale,
  comments,
  isCommentToolActive,
  newCommentDraft,
  onCancelNewComment,
  onAddComment,
  onResolveComment,
  onDeleteComment
}) => {
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [draftText, setDraftText] = useState('');

  // Group top-level comments and replies
  const rootComments = comments.filter((c) => !c.parentId);
  const repliesByParent = new Map<string, CommentItem[]>();

  for (const c of comments) {
    if (c.parentId) {
      if (!repliesByParent.has(c.parentId)) repliesByParent.set(c.parentId, []);
      repliesByParent.get(c.parentId)!.push(c);
    }
  }

  const handleSendReply = (parentId: string) => {
    if (!replyText.trim()) return;
    onAddComment(replyText.trim(), 0, 0, parentId);
    setReplyText('');
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {/* In-Canvas New Comment Draft Composer */}
      {newCommentDraft && (
        <div
          className="pointer-events-auto absolute z-50 -translate-x-3 -translate-y-3"
          style={{
            left: `${newCommentDraft.x * stageScale + stagePos.x}px`,
            top: `${newCommentDraft.y * stageScale + stagePos.y}px`
          }}
        >
          <div className="w-7 h-7 rounded-full bg-accent border border-ink flex items-center justify-center shadow-[2px_2px_0px_#111110]">
            <MessageSquare className="w-3.5 h-3.5 text-ink" />
          </div>
          <div
            className="mt-2 w-72 p-3 rounded-lg bg-paper-card border border-ink shadow-[4px_5px_0px_#111110] font-mono text-xs flex flex-col gap-2 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-paper pb-1">
              <span className="font-bold text-ink text-[11px] uppercase tracking-wide">Add Comment</span>
              {onCancelNewComment && (
                <button
                  onClick={onCancelNewComment}
                  className="p-1 rounded text-ink-muted hover:text-ink hover:bg-paper-muted cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <textarea
              autoFocus
              rows={3}
              placeholder="Leave feedback or ask a question..."
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              className="w-full bg-paper/60 border border-border-paper rounded p-2 text-ink text-xs font-sans placeholder-ink-subtle focus:outline-none focus:border-ink resize-none"
            />
            <div className="flex items-center justify-end gap-1.5 pt-1">
              {onCancelNewComment && (
                <button
                  onClick={onCancelNewComment}
                  className="btn-paper-outline px-2.5 py-1 text-[11px] cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => {
                  if (draftText.trim()) {
                    onAddComment(draftText.trim(), newCommentDraft.x, newCommentDraft.y);
                    setDraftText('');
                    onCancelNewComment?.();
                  }
                }}
                disabled={!draftText.trim()}
                className="btn-paper-accent px-3 py-1 text-[11px] font-bold cursor-pointer disabled:opacity-40"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}
      {rootComments.map((comment, index) => {
        const screenX = comment.x * stageScale + stagePos.x;
        const screenY = comment.y * stageScale + stagePos.y;
        const replies = repliesByParent.get(comment.id) || [];
        const isOpen = activeCommentId === comment.id;

        return (
          <div
            key={comment.id}
            className="pointer-events-auto absolute"
            style={{ left: `${screenX}px`, top: `${screenY}px` }}
          >
            {/* Pinned Pin Button */}
            <button
              onClick={() => setActiveCommentId(isOpen ? null : comment.id)}
              className={`-translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-full border border-ink shadow-[2px_2px_0px_#111110] cursor-pointer transition-transform ${
                isOpen ? 'scale-115 ring-2 ring-accent' : 'hover:scale-110'
              } ${comment.isResolved ? 'opacity-60 bg-paper-muted' : ''}`}
              style={{ backgroundColor: comment.isResolved ? '#FAF8F4' : comment.userAvatar || '#FFE98A' }}
              title={`Comment by ${comment.userName}`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-ink" />
              {/* Unread indicator dot */}
              {!comment.isResolved && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent border border-ink" />
              )}
            </button>

            {/* Expanded Comment Thread Popover */}
            {isOpen && (
              <div
                className="absolute left-4 top-4 z-50 w-72 p-3 rounded-lg bg-paper-card border border-ink shadow-[4px_5px_0px_#111110] font-mono text-xs flex flex-col gap-2.5 animate-fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header: Author & Controls */}
                <div className="flex items-center justify-between border-b border-border-paper pb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full border border-ink flex items-center justify-center text-[10px] font-bold text-ink"
                      style={{ backgroundColor: comment.userAvatar || '#FFE98A' }}
                    >
                      {comment.userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-ink truncate max-w-[120px]">{comment.userName}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onResolveComment(comment.id, !comment.isResolved)}
                      title={comment.isResolved ? 'Unresolve comment' : 'Mark as resolved'}
                      className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                        comment.isResolved
                          ? 'text-emerald-700 bg-emerald-100 border border-emerald-500'
                          : 'text-ink-muted hover:text-ink hover:bg-paper-muted'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setActiveCommentId(null)}
                      className="p-1 rounded text-ink-muted hover:text-ink hover:bg-paper-muted cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Main Message Text */}
                <div className="text-ink text-xs leading-relaxed py-0.5 whitespace-pre-wrap break-words">
                  {comment.text}
                </div>

                {/* Threaded Replies List */}
                {replies.length > 0 && (
                  <div className="flex flex-col gap-2 pt-1 border-t border-border-paper">
                    {replies.map((r) => (
                      <div key={r.id} className="flex items-start gap-1.5 pl-2 border-l-2 border-border-paper">
                        <div
                          className="w-4 h-4 rounded-full border border-ink flex items-center justify-center text-[8px] font-bold text-ink shrink-0 mt-0.5"
                          style={{ backgroundColor: r.userAvatar || '#BFE3FF' }}
                        >
                          {r.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <span className="font-bold text-[10px] text-ink-muted block">{r.userName}</span>
                          <span className="text-ink text-[11px] leading-snug break-words">{r.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Input */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-border-paper">
                  <CornerDownRight className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                  <input
                    type="text"
                    placeholder="Reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendReply(comment.id);
                    }}
                    className="flex-1 bg-paper px-2 py-1 rounded border border-border-paper text-ink placeholder-ink-subtle text-xs focus:outline-none focus:border-ink"
                  />
                  <button
                    onClick={() => handleSendReply(comment.id)}
                    className="p-1 rounded text-ink hover:bg-paper-muted cursor-pointer"
                    title="Send reply"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CommentsLayer;
