FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 5000

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files
COPY ["src/CoreCourierService.Api/CoreCourierService.Api.csproj", "src/CoreCourierService.Api/"]
COPY ["src/CoreCourierService.Core/CoreCourierService.Core.csproj", "src/CoreCourierService.Core/"]
COPY ["src/CoreCourierService.Infrastructure/CoreCourierService.Infrastructure.csproj", "src/CoreCourierService.Infrastructure/"]

# Restore dependencies
RUN dotnet restore "src/CoreCourierService.Api/CoreCourierService.Api.csproj"

# Copy all source files
COPY . .

# Build
WORKDIR "/src/src/CoreCourierService.Api"
RUN dotnet build "CoreCourierService.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "CoreCourierService.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "CoreCourierService.Api.dll"]
