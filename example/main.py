
from fastapi import FastAPI, HTTPException, Path, Query, Header,Request
from typing import Optional

app = FastAPI()

# In-memory storage
users_db = {}
posts_db = []

# Routes

# 1. Register user
@app.post("/register")
def register_user(username: str = Query(...), email: str = Query(...), password: str = Query(...)):
    if username in users_db:
        raise HTTPException(status_code=400, detail="User already exists")
    users_db[username] = {"username": username, "email": email, "password": password}
    return {"message": "User registered"}

# 2. Login user
@app.post("/login")
def login(email: str = Query(...), password: str = Query(...)):
    for u in users_db.values():
        if u["email"] == email and u["password"] == password:
            return {"token": "mocked-jwt-token", "user": u["username"]}
    raise HTTPException(status_code=401, detail="Invalid credentials")

# 3. Get user profile
@app.get("/user/{username}")
def get_user(username: str, x_token: Optional[str] = Header(None)):
    if x_token != "mocked-jwt-token":
        raise HTTPException(status_code=403, detail="Unauthorized")
    if username not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    return users_db[username]

# 4. Update user
@app.put("/user/{username}")
def update_user(username: str, email: Optional[str] = Query(None), password: Optional[str] = Query(None), x_token: Optional[str] = Header(None)):
    if x_token != "mocked-jwt-token":
        raise HTTPException(status_code=403, detail="Unauthorized")
    if username not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    user = users_db[username]
    if email:
        user["email"] = email
    if password:
        user["password"] = password
    return {"message": "User updated"}

# 5. Delete user
@app.delete("/user/{username}")
def delete_user(username: str, x_token: Optional[str] = Header(None)):
    if x_token != "mocked-jwt-token":
        raise HTTPException(status_code=403, detail="Unauthorized")
    if username not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    del users_db[username]
    return {"message": "User deleted"}

# 6. Create post
@app.post("/posts")
def create_post(title: str = Query(...), content: str = Query(...)):
    post_id = len(posts_db) + 1
    posts_db.append({"title": title, "content": content, "id": post_id})
    return {"message": "Post created", "post_id": post_id}

# 7. Get posts with query params
@app.get("/posts")
def list_posts(skip: int = 0, limit: int = 10):
    return posts_db[skip:skip+limit]

# 8. Get single post
@app.get("/posts/{post_id}")
def get_post(post_id: int = Path(..., ge=1)):
    for post in posts_db:
        if post["id"] == post_id:
            return post
    raise HTTPException(status_code=404, detail="Post not found")

# 9. Submit feedback (accepts JSON body)
@app.post("/feedback")
async def submit_feedback(request: Request):
    data = await request.json()
    message = data.get("message")
    rating = data.get("rating")

    return {
        "message": "Feedback received",
        "feedback": {
            "message": message,
            "rating": rating
        }
    }
