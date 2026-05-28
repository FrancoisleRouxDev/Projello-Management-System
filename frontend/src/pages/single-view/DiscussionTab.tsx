import React, { useEffect, useState } from "react";
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

  if (loading) return <p style={{ padding: 20 }}>Loading discussion...</p>;
  if (error) return <p style={{ padding: 20, color: "red" }}>{error}</p>;

  return (
    <div style={{ padding: "16px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ margin: 0 }}>Discussion</h2>
      </div>

      {posts.length === 0 ? (
        <p>No posts yet in this discussion.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {posts.map((post) => (
            <div
              key={post.id}
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
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

              <div style={{ padding: "14px 16px" }}>
                {/* Caption */}
                {post.caption && (
                  <p style={{ margin: "0 0 12px 0", fontSize: "15px", lineHeight: "1.5" }}>
                    {post.caption}
                  </p>
                )}

                {/* Timestamp */}
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>
                  {new Date(post.createdAt).toLocaleString()}
                </div>

                {/* Emoji Reactions - Placeholder for now */}
                <div style={{ 
                  display: "flex", 
                  gap: "10px", 
                  marginBottom: "12px",
                  padding: "10px 0",
                  borderTop: "1px solid #f1f5f9",
                  borderBottom: "1px solid #f1f5f9"
                }}>
                  <span style={{ fontSize: "20px", cursor: "pointer" }}>👍</span>
                  <span style={{ fontSize: "20px", cursor: "pointer" }}>❤️</span>
                  <span style={{ fontSize: "20px", cursor: "pointer" }}>😂</span>
                  <span style={{ fontSize: "20px", cursor: "pointer" }}>👏</span>
                  <span style={{ fontSize: "20px", cursor: "pointer" }}>🔥</span>
                </div>

                {/* Comments Section - Placeholder for now */}
                <div>
                  <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px" }}>
                    3 comments
                  </div>

                  <input 
                    type="text" 
                    placeholder="Write a comment..." 
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "14px"
                    }}
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