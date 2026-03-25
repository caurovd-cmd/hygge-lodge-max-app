def calculate_comfort_score(temperature: float, humidity: float) -> float:
    score = (temperature * 0.7) + (humidity * 0.3)
    return min(max(score, 0), 100)
