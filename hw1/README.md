# GridWorld Value Iteration Visualizer

This project is a web-based visualization tool for the **Value Iteration** algorithm, a fundamental dynamic programming method used in Reinforcement Learning to find the optimal policy in a GridWorld environment.

## Features
- **Grid Setup**: Configure the grid size, start state, goal state, and place obstacles.
- **Value Iteration Algorithm**: Calculates the optimal value function for each state and derives the optimal policy.
- **Interactive UI**: Visualize the calculated state values and the optimal path (arrows) from any state to the goal.

## Project Structure
- `app.py`: Flask application that serves the frontend and handles the API requests.
- `gridworld.py`: Core logic for the GridWorld environment and the Value Iteration algorithm.
- `templates/index.html`: The main web page interface.
- `static/script.js`: Handles frontend interactions, API calls, and grid rendering.
- `static/style.css`: Styling for the frontend application.

## Installation & Setup

1. **Ensure you have Python installed.**
2. **Install required dependencies:**
   This project requires Flask and NumPy. You can install them using pip:
   ```bash
   pip install Flask numpy
   ```
3. **Run the Application:**
   Execute the `app.py` script to start the local web server:
   ```bash
   python app.py
   ```
4. **Access the App:**
   Open your web browser and go to `http://127.0.0.1:5000/`.

## Usage
1. Open the UI to view the GridWorld.
2. The system allows resolving value iteration properties based on a starting state, a goal state, and obstacles.
3. Once the algorithm is executed, you can observe the optimal policy (represented by directional arrows) and the calculated values for each state in the grid.
