namespace FinanceJarApp.Server.Services
{
    public interface IGeminiService
    {
        Task<string> GetChatResponseAsync(string userMessage, int userId);
        Task<float[]> GetEmbeddingAsync(string text);
        Task<string> GenerateChallengeAsync(decimal totalExpense);
        Task<string> AnalyzeImageAsync(Stream imageStream, string mimeType);
    }
}
