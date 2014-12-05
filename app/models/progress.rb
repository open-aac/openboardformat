require 'converter'

class Progress < ActiveRecord::Base
  @queue = :default
  serialize :settings, JSON
  before_save :generate_defaults
  
  def generate_defaults
    self.nonce ||= Digest::MD5.hexdigest("progress" + Time.now.to_i.to_s + rand(999999).to_s + "stuff")
    self.settings ||= {}
  end
  
  def errored!(e)
    self.settings ||= {}
    self.settings['error'] = {
      'message' => e.message,
      'backtrace' => e.backtrace
    }
    self.save
  end
  
  def finished!(attr)
    self.settings ||= {}
    self.settings['result'] = attr
    self.save
  end
  
  def status
    self.settings ||= {}
    status = 'pending'
    res = nil
    if self.settings['error']
      status = 'errored'
      # TODO: remove before going to production
      res = self.settings['error']
    elsif self.settings['result']
      status = 'finished'
      res = self.settings['result']
    end
    
    {
      :code => "#{self.id}_#{self.nonce}",
      :updated_at => self.updated_at,
      :status => status, 
      :result => res
    }
  end
  
  def self.update_current_progress(*args)
  end

  def self.as_percent(a, b, &block)
    block.call
  end
  
  def action
    (self.settings || {})['action']
  end
  
  def args
    (self.settings || {})['args']
  end
  
  def object
    self.settings['class'].constantize
  end
  
  def self.find_by_code(code)
    id, nonce = code.split(/_/, 2)
    p = Progress.find_by(:id => id)
    p = nil if p && p.nonce != nonce
    p
  end
  
  def self.cleanup
    Progress.where(['updated_at < ?', 3.weeks.ago]).destroy_all
  end
  
  def self.schedule(klass, action, *args)
    progress = Progress.new
    progress.settings = {
      'class' => klass.to_s,
      'action' => action,
      'args' => args
    }
    progress.save
    Resque.enqueue(Progress, progress.id)
    progress
  end

  # Resque-related stuff...
  def self.perform(progress_id)
    progress = Progress.find_by(:id => progress_id)
    return unless progress
    begin
      obj = progress.object
      res = obj.send(progress.action, *progress.args)
      progress.finished!(res)
    rescue => e
      progress.errored!(e)
    end
  rescue Resque::TermException
    Resque.enqueue(self, *args)
  end
  
  def self.on_failure_retry(e, *args)
    # TODO...
  end

  def self.scheduled?(method_name, *args)
    idx = Resque.size('default')
    idx.times do |i|
      schedule = Resque.peek('default', i)
      if schedule['class'] == 'Progress' && schedule['args'][0] == method_name
        if args.to_json == schedule['args'][1..-1].to_json
          return true
        end
      end
    end
    return false
  end
  
  def self.process_queues
    schedules = []
    Resque.queues.each do |key|
      while Resque.size(key) > 0
        schedules << Resque.pop(key)
      end
    end
    schedules.each do |schedule|
      raise "unknown job: #{schedule.to_json}" if schedule['class'] != 'Progress'
      Progress.perform(*(schedule['args']))
    end
  end
  
  def self.queues_empty?
    found = false
    Resque.queues.each do |key|
      return false if Resque.size(key) > 0
    end
    true
  end
  
  def self.flush_queues
    if Resque.redis
      Resque.queues.each do |key|
        Resque.redis.ltrim("queue:#{key}", 1, 0)
      end
    end
  end
end
