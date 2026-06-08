import React, { useEffect, useState } from "react";
import "./DiscussionTab.css";
import { API_BASE_URL } from "../../config";

type DiscussionPost = {
  id: number;
  projectId: number;
  userId: string;
  caption: string | null;
  imageUrl: string;
  createdAt: string;
};

interface DiscussionTabProps {
  projectId: number;
}

export default function DiscussionTab({ projectId }: DiscussionTabProps) {
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/updates`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) throw new Error("Failed to fetch posts");

      const data: DiscussionPost[] = await res.json();
      setPosts(data);
    } catch (err: any) {
      setError(err.message || "Failed to load discussion");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchPosts();
    }
  }, [projectId]);

  if (loading) return <p className="discussion-tab__loading">Loading discussion...</p>;
  if (error) return <p className="discussion-tab__error">{error}</p>;

  return (
    <div className="discussion-tab">
      <div className="discussion-tab__header">
        <h2 className="discussion-tab__title">Discussion</h2>
      </div>

      {posts.length === 0 ? (
        <p>No posts yet in this discussion.</p>
      ) : (
        <div className="discussion-tab__post-list">
          {posts.map((post) => (
            <div key={post.id} className="discussion-tab__post-card">
              {/* Image - Made smaller */}
              {post.imageUrl && (
                <img
                  src={post.imageUrl}
                  alt="Post"
                  style={{
                    width: "100%",
                    maxHeight: "280px",
                    objectFit: "cover",
                  }}
                />
              )}

              <div className="discussion-tab__post-content">
                {/* Caption */}
                {post.caption && (
                  <p className="discussion-tab__post-caption">{post.caption}</p>
                )}

                {/* Timestamp */}
                <div className="discussion-tab__post-meta">
                  {new Date(post.createdAt).toLocaleString()}
                </div>

                {/* Emoji Reactions - Placeholder for now */}
                <div className="discussion-tab__reactions">
                  <span className="discussion-tab__reaction">👍</span>
                  <span className="discussion-tab__reaction">❤️</span>
                  <span className="discussion-tab__reaction">😂</span>
                  <span className="discussion-tab__reaction">👏</span>
                  <span className="discussion-tab__reaction">🔥</span>
                </div>

                {/* Comments Section - Placeholder for now */}
                <div>
                  <div className="discussion-tab__comments-label">3 comments</div>

                  <input
                    type="text"
                    placeholder="Write a comment..."
                    className="discussion-tab__comment-input"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}