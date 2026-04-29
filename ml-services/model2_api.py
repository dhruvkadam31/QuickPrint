# ============================================================
#  QUICKPRINT — MODEL 2 FASTAPI SERVICE
#  Serves the Print Order Wait Time Prediction model
#
#  HOW TO RUN:
#  1. pip install -r requirements.txt
#  2. Make sure quickprint_model.pkl is in the same folder
#  3. Run: uvicorn model2_api:app --reload
#  4. Open browser: http://localhost:8001/docs
#     (port 8001 so it doesn't clash with Model 1 on 8000)
# ============================================================

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import joblib
import pandas as pd
import numpy as np
import os

# ── Create the FastAPI app ───────────────────────────────────
app = FastAPI(
    title="QuickPrint — Model 2 API",
    description="Predicts wait time (in minutes) for a print order based on queue state and job details.",
    version="1.0.0"
)


# ── Load the trained model when server starts ────────────────
MODEL_PATH = "quickprint_model.pkl"

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(
        f"Model file '{MODEL_PATH}' not found. "
        "Make sure quickprint_model.pkl is in the same folder as this file."
    )

model = joblib.load(MODEL_PATH)
print(f"✓ Model 2 loaded from {MODEL_PATH}")


# ── Define what the INPUT should look like ───────────────────
class WaitTimeRequest(BaseModel):

    queue_length: int = Field(
        ..., ge=0, le=50,
        description="Number of jobs currently ahead in the queue",
        example=5
    )
    backlog_pages: int = Field(
        ..., ge=0, le=2000,
        description="Total number of pages waiting to be printed before this job",
        example=120
    )
    active_printers: int = Field(
        ..., ge=1, le=4,
        description="Number of printers currently running",
        example=2
    )
    printer_speed_ppm: int = Field(
        ..., ge=10, le=60,
        description="Printer speed in pages per minute",
        example=30
    )
    job_pages: int = Field(
        ..., ge=1, le=500,
        description="Number of pages in this student's print job",
        example=15
    )
    is_color: int = Field(
        ..., ge=0, le=1,
        description="Is this a color print job? (1=yes, 0=no)",
        example=0
    )
    is_duplex: int = Field(
        ..., ge=0, le=1,
        description="Is this a double sided print? (1=yes, 0=no)",
        example=0
    )
    predicted_demand: int = Field(
        ..., ge=5, le=39,
        description="Demand level from Model 1 output (peak_level * 39, rounded)",
        example=20
    )


# ── Define what the OUTPUT will look like ────────────────────
class WaitTimeResponse(BaseModel):
    estimated_wait_minutes: float = Field(description="Predicted wait time in minutes")
    message_to_student: str       = Field(description="Human readable message for the student")
    urgency: str                  = Field(description="How urgent: Low / Medium / High")
    advice: str                   = Field(description="What the student should do")


# ── Helper: build student message and urgency ────────────────
def get_wait_info(wait_minutes: float):

    # round to 1 decimal for display
    wait_display = round(wait_minutes, 1)

    if wait_minutes <= 3:
        urgency = "Low"
        message = f"Your order will be ready in about {wait_display} minutes. Almost instant!"
        advice  = "You can wait at the shop — it will be done very quickly."

    elif wait_minutes <= 10:
        urgency = "Low"
        message = f"Your order will be ready in about {wait_display} minutes."
        advice  = "You can wait at the shop or grab a quick coffee nearby."

    elif wait_minutes <= 20:
        urgency = "Medium"
        message = f"Your order will be ready in approximately {wait_display} minutes."
        advice  = "You have time to step away. Come back in about 15-20 minutes."

    elif wait_minutes <= 35:
        urgency = "High"
        message = f"It's busy right now. Expected wait is {wait_display} minutes."
        advice  = "Consider coming back later or check if another vendor has shorter queue."

    else:
        urgency = "High"
        message = f"Very high demand. Expected wait is {wait_display} minutes."
        advice  = "We recommend visiting another print vendor or coming back after peak hours."

    return message, urgency, advice


# ── ROUTE 1: Root ────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "service": "QuickPrint Model 2 API",
        "status" : "running",
        "message": "Go to /docs to test the API"
    }


# ── ROUTE 2: Health check ────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "model": "quickprint_model.pkl"}


# ── ROUTE 3: Main prediction endpoint ───────────────────────
@app.post("/predict", response_model=WaitTimeResponse)
def predict_wait_time(request: WaitTimeRequest):

    try:
        # Step 1: build input dataframe
        input_data = pd.DataFrame([{
            "queue_length"      : request.queue_length,
            "backlog_pages"     : request.backlog_pages,
            "active_printers"   : request.active_printers,
            "printer_speed_ppm" : request.printer_speed_ppm,
            "job_pages"         : request.job_pages,
            "is_color"          : request.is_color,
            "is_duplex"         : request.is_duplex,
            "predicted_demand"  : request.predicted_demand,
        }])

        # Step 2: run the model
        raw_prediction = model.predict(input_data)[0]

        # Step 3: clip to realistic range — no negative wait times
        wait_minutes = float(max(0.1, raw_prediction))

        # Step 4: get message, urgency, advice
        message, urgency, advice = get_wait_info(wait_minutes)

        # Step 5: return response
        return WaitTimeResponse(
            estimated_wait_minutes = round(wait_minutes, 1),
            message_to_student     = message,
            urgency                = urgency,
            advice                 = advice
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


# ── ROUTE 4: Combined prediction (Model 1 + Model 2 together) 
@app.post("/predict/full")
def predict_full(request: WaitTimeRequest):
    # this route shows everything in one response
    # useful for your frontend dashboard

    try:
        input_data = pd.DataFrame([{
            "queue_length"      : request.queue_length,
            "backlog_pages"     : request.backlog_pages,
            "active_printers"   : request.active_printers,
            "printer_speed_ppm" : request.printer_speed_ppm,
            "job_pages"         : request.job_pages,
            "is_color"          : request.is_color,
            "is_duplex"         : request.is_duplex,
            "predicted_demand"  : request.predicted_demand,
        }])

        raw          = model.predict(input_data)[0]
        wait_minutes = float(max(0.1, raw))
        message, urgency, advice = get_wait_info(wait_minutes)

        # calculate completion time from now
        import datetime
        now              = datetime.datetime.now()
        completion_time  = now + datetime.timedelta(minutes=wait_minutes)

        return {
            "estimated_wait_minutes" : round(wait_minutes, 1),
            "estimated_completion"   : completion_time.strftime("%I:%M %p"),
            "message_to_student"     : message,
            "urgency"                : urgency,
            "advice"                 : advice,
            "job_summary": {
                "pages"         : request.job_pages,
                "color"         : "Yes" if request.is_color  else "No",
                "duplex"        : "Yes" if request.is_duplex else "No",
                "queue_position": request.queue_length + 1,
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


# ── ROUTE 5: Compare scenarios ───────────────────────────────
@app.post("/predict/compare")
def compare_scenarios(request: WaitTimeRequest):
    # given the current order, show what happens under 3 conditions
    # useful to show student: "if you wait 1 hour, queue will be shorter"

    scenarios = [
        # current situation
        {
            "label"           : "Right now",
            "queue_length"    : request.queue_length,
            "backlog_pages"   : request.backlog_pages,
            "active_printers" : request.active_printers,
            "predicted_demand": request.predicted_demand,
        },
        # if student comes back in 1 hour (queue likely shorter)
        {
            "label"           : "If you come back in 1 hour",
            "queue_length"    : max(1, request.queue_length - 4),
            "backlog_pages"   : max(10, request.backlog_pages - 80),
            "active_printers" : request.active_printers,
            "predicted_demand": max(5, request.predicted_demand - 8),
        },
        # if vendor adds one more printer
        {
            "label"           : "If one more printer is activated",
            "queue_length"    : request.queue_length,
            "backlog_pages"   : request.backlog_pages,
            "active_printers" : min(4, request.active_printers + 1),
            "predicted_demand": request.predicted_demand,
        },
    ]

    results = []
    for s in scenarios:
        input_data = pd.DataFrame([{
            "queue_length"      : s["queue_length"],
            "backlog_pages"     : s["backlog_pages"],
            "active_printers"   : s["active_printers"],
            "printer_speed_ppm" : request.printer_speed_ppm,
            "job_pages"         : request.job_pages,
            "is_color"          : request.is_color,
            "is_duplex"         : request.is_duplex,
            "predicted_demand"  : s["predicted_demand"],
        }])

        raw          = model.predict(input_data)[0]
        wait_minutes = float(max(0.1, raw))
        _, urgency, _ = get_wait_info(wait_minutes)

        results.append({
            "scenario"              : s["label"],
            "estimated_wait_minutes": round(wait_minutes, 1),
            "urgency"               : urgency,
        })

    return {"comparisons": results}
