from autogen import AssistantAgent, UserProxyAgent

config_list = [{"model": "phi3", "api_base": "http://localhost:11434/v1", "api_key": "ollama"}]

developer = AssistantAgent(
    name="Developer",
    system_message="Создай Flask-приложение с динамическим расчетом уровня уюта. Добавь форму для ввода температуры и влажности.",
    llm_config={"config_list": config_list},
)

user_proxy = UserProxyAgent(
    name="User",
    human_input_mode="NEVER",
    code_execution_config={"work_dir": "hygge-lodge-max-app"},
)

user_proxy.initiate_chat(
    developer,
    message="Обнови существующее приложение Hygge Lodge Max App: добавь форму ввода, улучши UI, сохрани все файлы в папку hygge-lodge-max-app."
)
