@echo off
cd /d "c:\Rafael\Programação\ConsultaCnpj\consulta-cnpj-python"
echo ========================================
echo Instalando dependencias do ConsultaCNPJ
echo ========================================
echo.

echo Passo 1: Atualizando pip...
"venv\Scripts\python" -m pip install --upgrade pip --trusted-host pypi.org --trusted-host files.pythonhosted.org

echo.
echo Passo 2: Instalando Flask...
"venv\Scripts\python" -m pip install flask==3.1.0 --trusted-host pypi.org --trusted-host files.pythonhosted.org

echo.
echo Passo 3: Instalando Requests...
"venv\Scripts\python" -m pip install requests==2.32.3 --trusted-host pypi.org --trusted-host files.pythonhosted.org

echo.
echo Passo 4: Instalando Gunicorn...
"venv\Scripts\python" -m pip install gunicorn==23.0.0 --trusted-host pypi.org --trusted-host files.pythonhosted.org

echo.
echo ========================================
echo Instalacao concluida!
echo ========================================
pause

