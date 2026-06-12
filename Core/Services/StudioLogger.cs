using System;

public static class StudioLogger
{
    public static void Log(string message)
    {
        try
        {
            UnityEngine.Debug.Log(message);
        }
        catch
        {
            Console.WriteLine(message);
        }
    }

    public static void LogWarning(string message)
    {
        try
        {
            UnityEngine.Debug.LogWarning(message);
        }
        catch
        {
            Console.WriteLine("Warning: " + message);
        }
    }

    public static void LogError(string message)
    {
        try
        {
            UnityEngine.Debug.LogError(message);
        }
        catch
        {
            Console.Error.WriteLine("Error: " + message);
        }
    }
}
