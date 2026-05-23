from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import json
import os
from openai import OpenAI
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Enable CORS for both Studio and Chatbot
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Database path
DB_PATH = "published_workflows.json"

class WorkflowStep(BaseModel):
    id: str
    actionId: str
    pageId: str
    title: str
    executionMode: str
    expectedAction: Optional[str] = None
    targetQuery: Optional[str] = None
    locators: Optional[dict] = None
    overrideValue: Optional[str] = None

class Workflow(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    steps: List[WorkflowStep]
    isPublished: bool = True
    createdAt: Optional[int] = None
    updatedAt: Optional[int] = None

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    text: str
    actions: Optional[List[dict]] = None

def load_db() -> List[dict]:
    if not os.path.exists(DB_PATH):
        return []
    try:
        with open(DB_PATH, "r") as f:
            content = f.read()
            if not content: return []
            return json.loads(content)
    except Exception as e:
        print(f"Error loading DB: {e}")
        return []

def save_db(data: List[dict]):
    with open(DB_PATH, "w") as f:
        json.dump(data, f, indent=2)

@app.get("/api/workflows")
async def get_all_workflows():
    return load_db()

@app.post("/api/publish")
async def publish_workflow(workflow: Workflow):
    db = load_db()
    # Update if exists, else append
    existing_idx = next((i for i, w in enumerate(db) if w["id"] == workflow.id), -1)
    if existing_idx > -1:
        db[existing_idx] = workflow.model_dump()
    else:
        db.append(workflow.model_dump())
    
    save_db(db)
    return {"status": "success", "message": f"Workflow '{workflow.name}' published successfully."}

@app.post("/api/unpublish/{workflow_id}")
async def unpublish_workflow(workflow_id: str):
    db = load_db()
    initial_len = len(db)
    db = [w for w in db if w["id"] != workflow_id]
    if len(db) < initial_len:
        save_db(db)
        return {"status": "success", "message": f"Workflow with ID '{workflow_id}' unpublished successfully."}
    return {"status": "success", "message": f"Workflow with ID '{workflow_id}' was not published."}

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    workflows = load_db()
    workflow_list_str = "\n".join([f"- {wf['name']} (ID: {wf['id']})" for wf in workflows])
    
    system_prompt = f"""You are Resa, the AI Automation Assistant for the RSVP platform.
YOUR STRICT RULE: You ONLY provide information about the automated guides (workflows) listed below. 
Do NOT answer general questions or give generic AI responses if they are not related to these guides.
If the user asks "how many", look at the list below.

AVAILABLE AUTOMATED GUIDES:
{workflow_list_str if workflows else "No guides available."}

INSTRUCTIONS:
1. If the user wants to start a guide, mention its name exactly.
2. If the user asks how many guides you have, answer based on the count of the list above ({len(workflows)}).
3. If the user asks something unrelated to these guides, politely inform them that you are specialized in the available automations and list them.
4. Keep answers concise.
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.message}
            ],
            temperature=0
        )
        
        reply_text = response.choices[0].message.content
        
        # Heuristic to detect if GPT is suggesting a specific workflow
        suggested_actions = []
        for wf in workflows:
            if wf['name'].lower() in reply_text.lower():
                suggested_actions.append({"label": wf["name"], "workflow_id": wf["id"]})
        
        # Fallback: if user asks for list/count, always show buttons
        user_msg = request.message.lower()
        if not suggested_actions and ("how many" in user_msg or "list" in user_msg or "show me" in user_msg):
            suggested_actions = [{"label": wf["name"], "workflow_id": wf["id"]} for wf in workflows]

        return ChatResponse(
            text=reply_text,
            actions=suggested_actions if suggested_actions else None
        )
    except Exception as e:
        return ChatResponse(text=f"Error connecting to OpenAI: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=6789)
