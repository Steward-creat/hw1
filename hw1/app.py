from flask import Flask, render_template, request, jsonify
from gridworld import GridWorld

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/run_policy', methods=['POST'])
def run_policy():
    data = request.json
    size = data.get('size', 5)
    start = data.get('start', [0, 0])
    goal = data.get('goal', [size - 1, size - 1])
    obstacles = data.get('obstacles', [])
    
    # Initialize grid world
    gw = GridWorld(size=size, start=start, goal=goal, obstacles=obstacles)
    
    # Run value iteration
    policy, values, iterations = gw.value_iteration()
    
    # Return formatted result
    return jsonify({
        'policy': policy,
        'values': values.tolist(),
        'iterations': iterations
    })

if __name__ == '__main__':
    app.run(debug=True)
