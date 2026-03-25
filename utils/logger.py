import os
import logging

def setup_logger():
    log_dir = 'logs'
    os.makedirs(log_dir, exist_ok=True)
    logger = logging.getLogger('hygge_lodge')
    logger.setLevel(logging.INFO)
    handler = logging.FileHandler(os.path.join(log_dir, 'app.log'))
    handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
    logger.addHandler(handler)
    return logger
