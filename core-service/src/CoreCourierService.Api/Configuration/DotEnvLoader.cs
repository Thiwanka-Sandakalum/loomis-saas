namespace CoreCourierService.Api.Configuration;

public static class DotEnvLoader
{
    public static void LoadFromCurrentPath()
    {
        var directory = new DirectoryInfo(Directory.GetCurrentDirectory());

        while (directory != null)
        {
            var envFilePath = Path.Combine(directory.FullName, ".env");
            if (File.Exists(envFilePath))
            {
                foreach (var rawLine in File.ReadAllLines(envFilePath))
                {
                    var line = rawLine.Trim();
                    if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#"))
                    {
                        continue;
                    }

                    var separatorIndex = line.IndexOf('=');
                    if (separatorIndex <= 0)
                    {
                        continue;
                    }

                    var key = line[..separatorIndex].Trim();
                    var value = line[(separatorIndex + 1)..].Trim();

                    if (string.IsNullOrWhiteSpace(key))
                    {
                        continue;
                    }

                    // Remove optional single or double quotes.
                    if ((value.StartsWith('"') && value.EndsWith('"')) ||
                        (value.StartsWith('\'') && value.EndsWith('\'')))
                    {
                        value = value[1..^1];
                    }

                    // Respect host-provided env vars (for CI/containers/secrets managers).
                    if (Environment.GetEnvironmentVariable(key) == null)
                    {
                        Environment.SetEnvironmentVariable(key, value);
                    }
                }

                return;
            }

            directory = directory.Parent;
        }
    }
}
