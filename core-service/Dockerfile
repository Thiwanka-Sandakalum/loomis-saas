# syntax=docker/dockerfile:1.7

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files first for better layer caching
COPY src/CoreCourierService.Api/CoreCourierService.Api.csproj src/CoreCourierService.Api/
COPY src/CoreCourierService.Core/CoreCourierService.Core.csproj src/CoreCourierService.Core/
COPY src/CoreCourierService.Infrastructure/CoreCourierService.Infrastructure.csproj src/CoreCourierService.Infrastructure/

RUN dotnet restore src/CoreCourierService.Api/CoreCourierService.Api.csproj

# Copy everything and publish
COPY . .
RUN dotnet publish src/CoreCourierService.Api/CoreCourierService.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "CoreCourierService.Api.dll"]
