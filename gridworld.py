import numpy as np
import random

class GridWorld:
    def __init__(self, size=5, start=[0,0], goal=[4,4], obstacles=[]):
        """
        Initialize the GridWorld with given parameters.
        :param size: Dimension of the grid (n x n).
        :param start: [row, col] format. Not strictly used for V(s) calculation if only goal gives reward.
        :param goal: Terminal state.
        :param obstacles: List of [row, col] coordinates representing walls.
        """
        self.size = size
        self.start = start
        self.goal = goal
        self.obstacles = obstacles
        
        # Specified parameters
        self.gamma = 0.9
        self.reward = -1
        self.theta = 0.001
        
        # State space
        self.states = [(r, c) for r in range(size) for c in range(size)]
        
        # Action space mapping
        # 0: Up, 1: Right, 2: Down, 3: Left
        self.action_space = ['U', 'R', 'D', 'L']
        self.action_deltas = {
            'U': (-1, 0),
            'D': (1, 0),
            'L': (0, -1),
            'R': (0, 1)
        }
        
        # Initialize randomly determined policy for each state
        self.policy = self._initialize_random_policy()
        
    def _initialize_random_policy(self):
        """
        Assign a random initial action choice to every state.
        Mapping string dict to easily send back to UI: {"0,0": "R", "0,1": "D", ...}
        """
        policy = {}
        for r in range(self.size):
            for c in range(self.size):
                if [r, c] == self.goal or [r, c] in self.obstacles:
                    policy[f"{r},{c}"] = None
                else:
                    policy[f"{r},{c}"] = random.choice(self.action_space)
        return policy

    def _is_terminal(self, state):
        return list(state) == self.goal

    def _is_obstacle(self, state):
        return list(state) in self.obstacles
        
    def _out_of_bounds(self, state):
        r, c = state
        return not (0 <= r < self.size and 0 <= c < self.size)
        
    def get_next_state(self, state, action):
        """
        Calculates next state given action.
        If hitting an obstacle or boundary, stay in the same position.
        """
        dr, dc = self.action_deltas[action]
        next_r = state[0] + dr
        next_c = state[1] + dc
        
        next_state = (next_r, next_c)
        if self._out_of_bounds(next_state) or self._is_obstacle(next_state):
            return state # stay in place
        return next_state
        
    def value_iteration(self):
        """
        Run Value Iteration to find optimal policy.
        """
        V = np.zeros((self.size, self.size))
        iterations = 0
        
        while True:
            delta = 0
            new_V = np.copy(V)
            
            for r in range(self.size):
                for c in range(self.size):
                    state = (r, c)
                    
                    if self._is_terminal(state) or self._is_obstacle(state):
                        continue
                        
                    v = V[r, c]
                    
                    max_val = -float('inf')
                    for action in self.action_space:
                        next_state = self.get_next_state(state, action)
                        val = self.reward + self.gamma * V[next_state[0], next_state[1]]
                        if val > max_val:
                            max_val = val
                            
                    new_V[r, c] = max_val
                    delta = max(delta, abs(v - max_val))
                    
            V = new_V
            iterations += 1
            if delta < self.theta:
                break
                
        # Extract optimal policy
        policy = {}
        for r in range(self.size):
            for c in range(self.size):
                state = (r, c)
                if self._is_terminal(state) or self._is_obstacle(state):
                    policy[f"{r},{c}"] = None
                    continue
                    
                max_val = -float('inf')
                best_action = None
                for action in self.action_space:
                    next_state = self.get_next_state(state, action)
                    val = self.reward + self.gamma * V[next_state[0], next_state[1]]
                    if val > max_val:
                        max_val = val
                        best_action = action
                policy[f"{r},{c}"] = best_action
                
        self.policy = policy
        return policy, V, iterations
