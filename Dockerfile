# Server/Dockerfile

# 1. Dùng Image .NET SDK để build code
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy file project và restore thư viện
COPY *.csproj ./
RUN dotnet restore

# Copy toàn bộ code và build ra file chạy (Release)
COPY . ./
RUN dotnet publish -c Release -o out

# 2. Dùng Image .NET Runtime để chạy (nhẹ hơn)
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/out .

# Mở cổng 8080
EXPOSE 8080

# Chạy app
ENTRYPOINT ["dotnet", "FinanceJarApp.Server.dll"]