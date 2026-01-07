using Qdrant.Client;
using Qdrant.Client.Grpc;
using System.Net.Sockets;

namespace FinanceJarApp.Server.Services
{
    public class QdrantService
    {
        private readonly QdrantClient _client;
        private const string COLLECTION_NAME = "finance_knowledge"; 
        private const ulong VECTOR_SIZE = 768; // Kích thước Vector của Gemini

        public QdrantService()
        {
            // 1. Lấy host: Nếu chạy Docker thì lấy biến môi trường, chạy Local thì lấy localhost
            string host = Environment.GetEnvironmentVariable("QDRANT_HOST") ?? "localhost";
            
            // 2. QUAN TRỌNG: Dùng cổng 6334 (gRPC) và tắt SSL (https: false)
            _client = new QdrantClient(host, 6334, https: false); 
        }

        // Khởi tạo Collection (Bộ nhớ)
        public async Task InitializeAsync()
        {
            try
            {
                var collections = await _client.ListCollectionsAsync();
                if (!collections.Contains(COLLECTION_NAME))
                {
                    await _client.CreateCollectionAsync(COLLECTION_NAME, new VectorParams { Size = VECTOR_SIZE, Distance = Distance.Cosine });
                    Console.WriteLine($"✅ [Qdrant] Đã tạo bộ nhớ mới: {COLLECTION_NAME}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ [Qdrant] Lỗi kết nối ban đầu: {ex.Message}");
            }
        }

        // Hàm mới: Kiểm tra xem bộ nhớ có rỗng không (để quyết định có nạp file không)
        public async Task<bool> IsMemoryEmpty()
        {
            try
            {
                var info = await _client.GetCollectionInfoAsync(COLLECTION_NAME);
                return info.PointsCount == 0;
            }
            catch
            {
                // Nếu lỗi (ví dụ chưa có collection) thì coi như là rỗng
                return true; 
            }
        }

        // Lưu ký ức
        public async Task SaveMemoryAsync(string text, float[] vector)
        {
            var point = new PointStruct
            {
                Id = Guid.NewGuid(),
                Vectors = vector,
                Payload = { 
                    ["content"] = text 
                }
            };

            await _client.UpsertAsync(COLLECTION_NAME, new[] { point });
        }

        // Tìm kiếm (Đã fix lỗi Crash 500)
        public async Task<List<string>> SearchMemoryAsync(float[] queryVector)
        {
            try 
            {
                var results = await _client.SearchAsync(
                    COLLECTION_NAME, 
                    queryVector, 
                    limit: 3 
                );

                var memories = new List<string>();
                foreach (var point in results)
                {
                    if (point.Score > 0.6f) 
                    {
                        // 🔥 FIX LỖI: Kiểm tra an toàn trước khi lấy dữ liệu
                        if (point.Payload.TryGetValue("content", out var contentValue))
                        {
                            memories.Add(contentValue.StringValue);
                        }
                    }
                }
                return memories;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Lỗi tìm kiếm Qdrant: {ex.Message}");
                return new List<string>(); // Trả về rỗng thay vì làm sập App
            }
        }
    }
}