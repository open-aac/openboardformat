class DocsController < ApplicationController
  def index
    render :index
  end
  # home page, any additional documentation (prolly all in ember)
  # TODO: disqus or something on some of the pages??

  def word_list
    compset = AACMetrics::Loader.retrieve(params['list'])
    data = AACMetrics::Metrics.analyze(compset)
    if params['weights']
      render plain: data[:buttons].map{|b| [b[:label], b[:effort]].join(' ') }.compact.uniq.join("\n")
    else
      render plain: data[:buttons].map{|b| b[:label] }.compact.uniq.sort_by{|w| w.match(/^[a-zA-Z]/) ? w.downcase : ('zzz' + w.downcase)}.join("\n")
    end
  end
end
