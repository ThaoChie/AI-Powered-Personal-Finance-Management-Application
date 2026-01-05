using Qdrant.Client;
using Qdrant.Client.Grpc;

namespace FinanceJarApp.Server.Services
{
    public class QdrantService
    {
        private readonly QdrantClient _client;
        private const string COLLECTION_NAME = "finance_knowledge"; // Tên bộ não
        private const ulong VECTOR_SIZE = 768; // Kích thước Vector của Gemini 004

        public QdrantService()
        {
            // Kết nối đến Docker Qdrant
            _client = new QdrantClient("localhost", 6334); 
        }

        // 1. Khởi tạo bộ nhớ (Chạy 1 lần đầu)
        public async Task InitializeAsync()
        {
            var collections = await _client.ListCollectionsAsync();
            if (!collections.Contains(COLLECTION_NAME))
            {
                await _client.CreateCollectionAsync(COLLECTION_NAME, new VectorParams { Size = VECTOR_SIZE, Distance = Distance.Cosine });
            }
        }

        // 2. Học kiến thức mới (Lưu vào Vector DB)
        public async Task SaveMemoryAsync(string text, float[] vector)
        {
            var point = new PointStruct
            {
                Id = Guid.NewGuid(),
                Vectors = vector,
                Payload = { 
                    ["content"] = text // Lưu lại nội dung gốc để sau này đọc
                }
            };

            await _client.UpsertAsync(COLLECTION_NAME, new[] { point });
        }

        // 3. Truy xuất ký ức (Tìm kiếm)
        public async Task<List<string>> SearchMemoryAsync(float[] queryVector)
        {
            var results = await _client.SearchAsync(
                COLLECTION_NAME, 
                queryVector, 
                limit: 3 // Chỉ lấy 3 thông tin liên quan nhất
            );

            var memories = new List<string>();
            foreach (var point in results)
            {
                // Chỉ lấy tin nếu độ tương đồng > 60%
                if (point.Score > 0.6) 
                {
                    memories.Add(point.Payload["content"].StringValue);
                }
            }
            return memories;
        }
    }
}