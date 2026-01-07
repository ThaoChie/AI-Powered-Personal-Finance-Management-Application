# --- Giai đoạn 1: Build (Dùng SDK nặng để build code) ---
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /app

# 1. Copy file csproj vào trước
COPY Server/*.csproj ./

# 2. Restore đích danh file
RUN dotnet restore "Server.csproj"

# 3. Copy toàn bộ code vào
COPY Server/ .

# 4. Build đích danh file
RUN dotnet build "Server.csproj" -c Release -o /app/build

# 5. Publish ra thư mục out
RUN dotnet publish "Server.csproj" -c Release -o /app/out

# --- Giai đoạn 2: Runtime (Dùng bản ASP.NET nhẹ để chạy) ---
# (Đây là đoạn bạn đang bị thiếu)
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

# Copy kết quả đã build từ giai đoạn 1 sang giai đoạn 2
COPY --from=build /app/out .

# Copy file knowledge.txt thủ công sang thư mục chạy
# (Docker sẽ tự tạo thư mục Data nếu chưa có)
COPY Server/Data/knowledge.txt /app/Data/knowledge.txt

# Mở cổng 8080 (Render mặc định dùng cổng này)
EXPOSE 8080

# Lệnh chạy server
ENTRYPOINT ["dotnet", "Server.dll"]