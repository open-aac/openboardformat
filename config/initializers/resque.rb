module RedisInit
  def self.init
    redis_url = ENV["REDISCLOUD_URL"] || ENV["OPENREDIS_URL"] || ENV["REDISGREEN_URL"] || ENV["REDISTOGO_URL"]
    return unless redis_url
    uri = URI.parse(redis_url)
    if defined?(Resque)
      Resque.redis = Redis.new(:host => uri.host, :port => uri.port, :password => uri.password)
      Resque.redis.namespace = "open_boards"
    end
    redis = Redis.new(:host => uri.host, :port => uri.port, :password => uri.password)
    @default = Redis::Namespace.new("open_boards-stash", :redis => redis)
  end
  
  def self.default
    @default
  end
end
RedisInit.init