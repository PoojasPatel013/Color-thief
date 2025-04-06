from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import time

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# In-memory game state (in a real app, use a database)
game_states = {}

# Game configuration
GAME_CONFIG = {
    "time_limit": 30 * 60,  # 30 minutes in seconds
    "puzzles": {
        "safe": {
            "solved": False,
            "solution": "1234",
            "description": "A locked safe with a 4-digit combination."
        },
        "bookshelf": {
            "solved": False,
            "solution": "red,blue,green",
            "description": "A bookshelf with colored books that need to be arranged."
        },
        "computer": {
            "solved": False,
            "solution": "password",
            "description": "A locked computer that needs a password."
        },
        "door": {
            "solved": False,
            "requires": ["safe", "bookshelf", "computer"],
            "description": "The exit door. Requires all other puzzles to be solved."
        }
    },
    "items": {
        "key": {
            "found": False,
            "location": "safe",
            "description": "A small golden key."
        },
        "note": {
            "found": False,
            "location": "bookshelf",
            "description": "A handwritten note with a clue."
        },
        "usb_drive": {
            "found": False,
            "location": "computer",
            "description": "A USB drive with important data."
        }
    }
}

def create_new_game_state():
    """Create a new game state based on the config"""
    return {
        "start_time": time.time(),
        "puzzles": {k: {"solved": False} for k in GAME_CONFIG["puzzles"]},
        "items": {k: {"found": False} for k in GAME_CONFIG["items"]},
        "hints_used": 0,
        "completed": False
    }

@app.route('/api/game/new', methods=['POST'])
def new_game():
    """Start a new game and return a session ID"""
    session_id = str(int(time.time()))
    game_states[session_id] = create_new_game_state()
    return jsonify({
        "session_id": session_id,
        "message": "New game started",
        "time_limit": GAME_CONFIG["time_limit"]
    })

@app.route('/api/game/state/<session_id>', methods=['GET'])
def get_game_state(session_id):
    """Get the current game state"""
    if session_id not in game_states:
        return jsonify({"error": "Game session not found"}), 404
    
    state = game_states[session_id]
    elapsed_time = time.time() - state["start_time"]
    time_remaining = max(0, GAME_CONFIG["time_limit"] - elapsed_time)
    
    # Check if time's up
    if time_remaining <= 0 and not state["completed"]:
        state["completed"] = True
        state["success"] = False
    
    return jsonify({
        "time_remaining": int(time_remaining),
        "puzzles": {
            k: {
                "solved": state["puzzles"][k]["solved"],
                "description": GAME_CONFIG["puzzles"][k]["description"]
            } for k in GAME_CONFIG["puzzles"]
        },
        "items": {
            k: {
                "found": state["items"][k]["found"],
                "description": GAME_CONFIG["items"][k]["description"] if state["items"][k]["found"] else "???"
            } for k in GAME_CONFIG["items"]
        },
        "hints_used": state["hints_used"],
        "completed": state["completed"],
        "success": state.get("success", False)
    })

@app.route('/api/game/solve/<session_id>/<puzzle_id>', methods=['POST'])
def solve_puzzle(session_id, puzzle_id):
    """Attempt to solve a puzzle"""
    if session_id not in game_states:
        return jsonify({"error": "Game session not found"}), 404
    
    if puzzle_id not in GAME_CONFIG["puzzles"]:
        return jsonify({"error": "Puzzle not found"}), 404
    
    state = game_states[session_id]
    
    # Check if game is already completed
    if state["completed"]:
        return jsonify({"error": "Game already completed"}), 400
    
    # Check if puzzle is already solved
    if state["puzzles"][puzzle_id]["solved"]:
        return jsonify({"error": "Puzzle already solved"}), 400
    
    # Get the solution attempt from the request
    data = request.json
    solution_attempt = data.get("solution", "")
    
    # Special case for the exit door
    if puzzle_id == "door":
        # Check if all required puzzles are solved
        required_puzzles = GAME_CONFIG["puzzles"]["door"]["requires"]
        all_solved = all(state["puzzles"][p]["solved"] for p in required_puzzles)
        
        if all_solved:
            state["puzzles"]["door"]["solved"] = True
            state["completed"] = True
            state["success"] = True
            return jsonify({
                "success": True,
                "message": "Congratulations! You've escaped the room!",
                "game_completed": True
            })
        else:
            return jsonify({
                "success": False,
                "message": "You need to solve all puzzles before opening the door."
            })
    
    # Check the solution for other puzzles
    correct_solution = GAME_CONFIG["puzzles"][puzzle_id]["solution"]
    
    if solution_attempt.lower() == correct_solution.lower():
        state["puzzles"][puzzle_id]["solved"] = True
        
        # If solving this puzzle reveals an item
        for item_id, item in GAME_CONFIG["items"].items():
            if item["location"] == puzzle_id and not state["items"][item_id]["found"]:
                state["items"][item_id]["found"] = True
                return jsonify({
                    "success": True,
                    "message": f"Puzzle solved! You found: {item['description']}",
                    "item_found": item_id
                })
        
        return jsonify({
            "success": True,
            "message": "Puzzle solved!"
        })
    else:
        return jsonify({
            "success": False,
            "message": "Incorrect solution. Try again."
        })

@app.route('/api/game/hint/<session_id>/<puzzle_id>', methods=['GET'])
def get_hint(session_id, puzzle_id):
    """Get a hint for a specific puzzle"""
    if session_id not in game_states:
        return jsonify({"error": "Game session not found"}), 404
    
    if puzzle_id not in GAME_CONFIG["puzzles"]:
        return jsonify({"error": "Puzzle not found"}), 404
    
    state = game_states[session_id]
    state["hints_used"] += 1
    
    # These would be better hints in a real game
    hints = {
        "safe": "Look for a 4-digit code hidden in the room. Maybe check the bookshelf?",
        "bookshelf": "The colors need to be arranged in a specific order. Look for a pattern elsewhere.",
        "computer": "The password might be written down somewhere. Have you checked all items?",
        "door": "You need to solve all other puzzles first."
    }
    
    return jsonify({
        "hint": hints.get(puzzle_id, "No hint available for this puzzle."),
        "hints_used": state["hints_used"]
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)