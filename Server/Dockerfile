# 1. Dùng Image .NET 9 SDK để build code
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /app

# Copy file project và restore thư viện
COPY *.csproj ./
RUN dotnet restore

# Copy toàn bộ code và build ra file chạy (Release)
COPY . ./
RUN dotnet publish -c Release -o out

# 2. Dùng Image .NET 9 Runtime để chạy (nhẹ hơn)
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/out .

# Mở cổng 8080
EXPOSE 8080

# 👇👇👇 SỬA DÒNG NÀY (Đổi tên thành Server.dll) 👇👇👇
ENTRYPOINT ["dotnet", "Server.dll"]