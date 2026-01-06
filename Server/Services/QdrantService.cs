using Qdrant.Client;
using Qdrant.Client.Grpc;

namespace FinanceJarApp.Server.Services
{
    public class QdrantService
    {
        private readonly QdrantClient _client;
        private const string COLLECTION_NAME = "finance_knowledge"; 
        private const ulong VECTOR_SIZE = 768; 

        public QdrantService()
        {
            string host = Environment.GetEnvironmentVariable("QDRANT_HOST") ?? "localhost";
            
            _client = new QdrantClient(host, 6334, https: false); 
        }

        public async Task InitializeAsync()
        {
            var collections = await _client.ListCollectionsAsync();
            if (!collections.Contains(COLLECTION_NAME))
            {
                await _client.CreateCollectionAsync(COLLECTION_NAME, new VectorParams { Size = VECTOR_SIZE, Distance = Distance.Cosine });
            }
        }

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

        // 3. Truy xuất ký ức (Tìm kiếm)
        public async Task<List<string>> SearchMemoryAsync(float[] queryVector)
        {
            var results = await _client.SearchAsync(
                COLLECTION_NAME, 
                queryVector, 
                limit: 3 
            );

            var memories = new List<string>();
            foreach (var point in results)
            {
                if (point.Score > 0.6) 
                {
                    memories.Add(point.Payload["content"].StringValue);
                }
            }
            return memories;
        }
    }
}