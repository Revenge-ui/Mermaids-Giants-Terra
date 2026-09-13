using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace RiftboundLauncher
{
    internal sealed class LauncherForm : Form
    {
        private const string GameUrl = "http://localhost:5173";
        private const string HealthUrl = "http://127.0.0.1:3001/health";
        private const string FrontendUrl = "http://127.0.0.1:5173";
        private readonly Label statusLabel;
        private readonly ProgressBar progressBar;
        private readonly Label percentLabel;
        private readonly Button logButton;
        private readonly Button exitButton;
        private readonly string projectRoot;
        private readonly string portableRoot;
        private readonly List<Process> ownedProcesses = new List<Process>();
        private bool closing;

        public LauncherForm()
        {
            Text = "Mermaids-Giants-Terra";
            Width = 470;
            Height = 230;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = Color.FromArgb(20, 21, 25);
            ForeColor = Color.FromArgb(236, 227, 207);
            Font = new Font("Microsoft YaHei UI", 10F);

            var title = new Label { Text = "Mermaids-Giants-Terra", AutoSize = false, TextAlign = ContentAlignment.MiddleCenter, Font = new Font("Georgia", 19F, FontStyle.Bold), ForeColor = Color.FromArgb(232, 197, 119), Left = 20, Top = 25, Width = 414, Height = 42 };
            statusLabel = new Label { Text = "Loading...", AutoSize = false, TextAlign = ContentAlignment.MiddleCenter, Left = 25, Top = 72, Width = 404, Height = 28 };
            progressBar = new ProgressBar { Left = 65, Top = 108, Width = 324, Height = 19, Minimum = 0, Maximum = 100, Value = 5, Style = ProgressBarStyle.Continuous };
            percentLabel = new Label { Text = "5%", AutoSize = false, TextAlign = ContentAlignment.MiddleCenter, Left = 25, Top = 132, Width = 404, Height = 24 };
            logButton = new Button { Text = "查看日志", Left = 91, Top = 156, Width = 125, Height = 32, Visible = false, BackColor = Color.FromArgb(95, 72, 32), FlatStyle = FlatStyle.Flat };
            exitButton = new Button { Text = "退出", Left = 238, Top = 156, Width = 125, Height = 32, Visible = false, BackColor = Color.FromArgb(48, 50, 57), FlatStyle = FlatStyle.Flat };
            logButton.Click += delegate { OpenLog(); };
            exitButton.Click += delegate { Close(); };
            Controls.Add(title); Controls.Add(statusLabel); Controls.Add(progressBar); Controls.Add(percentLabel); Controls.Add(logButton); Controls.Add(exitButton);

            portableRoot = FindPortableRoot();
            projectRoot = FindProjectRoot();
            Shown += async delegate { await StartGameAsync(); };
            FormClosing += OnLauncherClosing;
        }

        private static string FindProjectRoot()
        {
            var current = new DirectoryInfo(AppDomain.CurrentDomain.BaseDirectory);
            for (var depth = 0; depth < 4 && current != null; depth += 1, current = current.Parent)
            {
                if (File.Exists(Path.Combine(current.FullName, "package.json"))) return current.FullName;
            }
            return null;
        }

        private static string FindPortableRoot()
        {
            var root = AppDomain.CurrentDomain.BaseDirectory;
            return File.Exists(Path.Combine(root, "runtime", "node.exe"))
                && File.Exists(Path.Combine(root, "app", "server.mjs"))
                && File.Exists(Path.Combine(root, "app", "static-server.mjs"))
                && File.Exists(Path.Combine(root, "app", "client", "index.html"))
                ? root
                : null;
        }

        private async Task StartGameAsync()
        {
            try
            {
                SetProgress(12);
                if (await AreGameServicesHealthyAsync()) { Ready(); return; }
                SetProgress(22);
                if (IsPortOccupied(3001)) throw new InvalidOperationException("后端端口 3001 已被其他程序占用，请先关闭占用该端口的程序。");
                if (IsPortOccupied(5173)) throw new InvalidOperationException("前端端口 5173 已被其他程序占用，请先关闭占用该端口的程序。");
                if (portableRoot != null)
                {
                    SetProgress(42);
                    await StartPortableGameAsync();
                    return;
                }
                if (projectRoot == null) throw new FileNotFoundException("找不到 CardGame 项目目录。请把 EXE 保留在项目的 release 文件夹中。");
                if (!File.Exists(Path.Combine(projectRoot, "apps", "server", "package.json")) || !File.Exists(Path.Combine(projectRoot, "client", "package.json")))
                    throw new FileNotFoundException("缺少前端或后端项目文件，请确认游戏目录完整。");
                if (!CommandAvailable("node.exe", "--version") || !CommandAvailable("cmd.exe", "/d /s /c \"npm --version\""))
                    throw new InvalidOperationException("没有找到 Node.js/npm。请从 Node.js 官方网站安装项目要求的 Node.js LTS。");

                SetProgress(45);
                var startInfo = new ProcessStartInfo("cmd.exe", "/d /s /c \"npm run dev\"");
                startInfo.WorkingDirectory = projectRoot;
                StartOwnedProcess(startInfo);
                await WaitUntilReadyAsync("本地游戏服务启动失败，进程已提前退出。请确认已经安装项目依赖。");
            }
            catch (Exception error)
            {
                WriteDiagnostic(error.ToString());
                StopOwnedServer();
                ShowFailure();
            }
        }

        private async Task StartPortableGameAsync()
        {
            SetProgress(50);
            var runtime = Path.Combine(portableRoot, "runtime", "node.exe");

            var backend = CreateHiddenProcess(runtime, "\"" + Path.Combine(portableRoot, "app", "server.mjs") + "\"", portableRoot);
            backend.EnvironmentVariables["NODE_ENV"] = "development";
            backend.EnvironmentVariables["HOST"] = "127.0.0.1";
            backend.EnvironmentVariables["PORT"] = "3001";
            backend.EnvironmentVariables["ALLOWED_ORIGINS"] = "http://localhost:5173,http://127.0.0.1:5173";
            StartOwnedProcess(backend);

            var frontend = CreateHiddenProcess(runtime, "\"" + Path.Combine(portableRoot, "app", "static-server.mjs") + "\"", portableRoot);
            frontend.EnvironmentVariables["CLIENT_PORT"] = "5173";
            frontend.EnvironmentVariables["CLIENT_HOST"] = "127.0.0.1";
            StartOwnedProcess(frontend);

            await WaitUntilReadyAsync("便携版游戏服务启动失败，请重新解压完整压缩包后再试。");
        }

        private static ProcessStartInfo CreateHiddenProcess(string fileName, string arguments, string workingDirectory)
        {
            return new ProcessStartInfo(fileName, arguments)
            {
                WorkingDirectory = workingDirectory,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };
        }

        private void StartOwnedProcess(ProcessStartInfo startInfo)
        {
            startInfo.UseShellExecute = false;
            startInfo.CreateNoWindow = true;
            startInfo.RedirectStandardOutput = true;
            startInfo.RedirectStandardError = true;
            var process = Process.Start(startInfo);
            if (process == null) throw new InvalidOperationException("无法创建游戏服务进程。");
            process.OutputDataReceived += delegate(object sender, DataReceivedEventArgs args) { if (!string.IsNullOrWhiteSpace(args.Data)) WriteDiagnostic("[service] " + args.Data); };
            process.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs args) { if (!string.IsNullOrWhiteSpace(args.Data)) WriteDiagnostic("[service-error] " + args.Data); };
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();
            ownedProcesses.Add(process);
        }

        private async Task WaitUntilReadyAsync(string exitedMessage)
        {
            for (var attempt = 0; attempt < 80; attempt += 1)
            {
                if (ownedProcesses.Exists(process => process.HasExited)) throw new InvalidOperationException(exitedMessage);
                SetProgress(Math.Min(95, 52 + attempt / 2));
                if (await AreGameServicesHealthyAsync())
                {
                    Ready();
                    return;
                }
                await Task.Delay(250);
            }
            throw new TimeoutException("等待前端或后端启动超时。");
        }

        private static void WriteDiagnostic(string message)
        {
            try { File.AppendAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "launcher-error.txt"), DateTime.Now.ToString("s") + " " + message + Environment.NewLine); }
            catch { }
        }

        private void SetProgress(int value)
        {
            progressBar.Value = Math.Max(0, Math.Min(100, value));
            percentLabel.Text = progressBar.Value + "%";
        }

        private async void Ready()
        {
            SetProgress(100);
            statusLabel.Text = "Ready";
            await Task.Delay(450);
            if (Environment.GetEnvironmentVariable("CARDGAME_LAUNCHER_NO_BROWSER") != "1") OpenGame();
            WindowState = FormWindowState.Minimized;
        }

        private void ShowFailure()
        {
            statusLabel.Text = "启动失败";
            logButton.Visible = true;
            exitButton.Visible = true;
        }

        private void OpenLog()
        {
            try { Process.Start(new ProcessStartInfo(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "launcher-error.txt")) { UseShellExecute = true }); }
            catch { }
        }

        private static bool CommandAvailable(string file, string arguments)
        {
            try
            {
                var info = new ProcessStartInfo(file, arguments) { UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true };
                using (var process = Process.Start(info)) { return process != null && process.WaitForExit(5000) && process.ExitCode == 0; }
            }
            catch { return false; }
        }

        private static bool IsPortOccupied(int port)
        {
            try { using (var client = new TcpClient()) { var result = client.BeginConnect(IPAddress.Loopback, port, null, null); return result.AsyncWaitHandle.WaitOne(200) && client.Connected; } }
            catch { return false; }
        }

        private static async Task<bool> IsCardGameHealthyAsync()
        {
            try
            {
                var request = (HttpWebRequest)WebRequest.Create(HealthUrl);
                request.Timeout = 600;
                using (var response = (HttpWebResponse)await request.GetResponseAsync())
                using (var reader = new StreamReader(response.GetResponseStream()))
                    return response.StatusCode == HttpStatusCode.OK && (await reader.ReadToEndAsync()).Contains("riftbound-server");
            }
            catch { return false; }
        }

        private static async Task<bool> IsFrontendHealthyAsync()
        {
            try
            {
                var request = (HttpWebRequest)WebRequest.Create(FrontendUrl);
                request.Timeout = 600;
                using (var response = (HttpWebResponse)await request.GetResponseAsync())
                using (var reader = new StreamReader(response.GetResponseStream()))
                    return response.StatusCode == HttpStatusCode.OK && (await reader.ReadToEndAsync()).Contains("id=\"root\"");
            }
            catch { return false; }
        }

        private static async Task<bool> AreGameServicesHealthyAsync()
        {
            return await IsCardGameHealthyAsync() && await IsFrontendHealthyAsync();
        }

        private void OpenGame()
        {
            try { Process.Start(new ProcessStartInfo(GameUrl) { UseShellExecute = true }); }
            catch (Exception error) { WriteDiagnostic(error.ToString()); ShowFailure(); }
        }

        private void OnLauncherClosing(object sender, FormClosingEventArgs eventArgs)
        {
            if (closing) return;
            closing = true;
            StopOwnedServer();
        }

        private void StopOwnedServer()
        {
            foreach (var process in ownedProcesses)
            {
                try
                {
                    if (!process.HasExited)
                    {
                        var info = new ProcessStartInfo("taskkill.exe", "/PID " + process.Id + " /T /F") { UseShellExecute = false, CreateNoWindow = true };
                        using (var killer = Process.Start(info)) { if (killer != null) killer.WaitForExit(5000); }
                    }
                }
                catch { }
            }
            ownedProcesses.Clear();
        }
    }

    internal static class Program
    {
        [STAThread]
        private static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new LauncherForm());
        }
    }
}
