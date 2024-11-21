require 'converter'

class ConversionsController < ApplicationController
  skip_before_action :verify_authenticity_token
  # internal api for getting S3 upload paramaters, checking status, and performing conversion
  def upload_params
    # TODO: some kind of throttling or captcha or something to prevent abuse
    res = Converter.remote_upload_params(params['filename'], params['content_type'])
    render json: res
  end
  
  def convert
    p = Progress.schedule(Converter, :convert_file, params['url'], params['type'])
    render json: p.status
  end
  
  def validate
    p = Progress.schedule(Converter, :validate_file, params['url'], params['type'])
    render json: p.status
  end

  def obfset
    p = Progress.schedule(Converter, :generate_obfset, params['url'], params['type'])
    render json: p.status
  end

  def analyze
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    # caching results for common vocabs
    url = params['url'] || ''
    comp = params['comp'] || ''
    progress_id = nil
    if !url.match(/http/) && !url.match(/http/)
      progress_id = RedisInit.default.get("progress/#{url}/#{comp}")
    end
    progress = Progress.find_by(id: progress_id) if progress_id
    new_progress = false
    if !progress
      progress = Progress.schedule(Converter, :analyze_obfset, url, comp)
      new_progress = true
    end
    if !url.match(/http/) && !comp.match(/http/) && new_progress
      RedisInit.default.setex("progress/#{url}/#{comp}", 5.days.to_i, progress.id.to_s)
      Progress.schedule(Progress, :clear_old);
    end
    render json: progress.status
  end
  
  def analyze_preflight
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    render json: {ok: true}
  end

  def status
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    p = Progress.find_by_code(params['code'])
    if p
      render json: p.status
    else
      render json: {error: "not found"}, :status => 400
    end
  end
end
