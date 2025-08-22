import React, { useState } from 'react';
import { Send, Key, Settings, MessageCircle, Loader2, Eye, EyeOff } from 'lucide-react';

const MultiModelChatApp = () => {
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    google: '',
    cohere: ''
  });
  
  const [showApiKeys, setShowApiKeys] = useState({
    openai: false,
    anthropic: false,
    google: false,
    cohere: false
  });
  
  const [question, setQuestion] = useState('');
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState({});
  const [showSettings, setShowSettings] = useState(false);

  const models = [
    { id: 'openai', name: 'OpenAI GPT', color: 'bg-green-500', endpoint: 'https://api.openai.com/v1/chat/completions' },
    { id: 'anthropic', name: 'Claude', color: 'bg-orange-500', endpoint: 'https://api.anthropic.com/v1/messages' },
    { id: 'google', name: 'Gemini', color: 'bg-blue-500', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent' },
    { id: 'cohere', name: 'Cohere', color: 'bg-purple-500', endpoint: 'https://api.cohere.ai/v1/generate' }
  ];

  const handleApiKeyChange = (modelId, value) => {
    setApiKeys(prev => ({ ...prev, [modelId]: value }));
  };

  const toggleApiKeyVisibility = (modelId) => {
    setShowApiKeys(prev => ({ ...prev, [modelId]: !prev[modelId] }));
  };

  const getAvailableModels = () => {
    return models.filter(model => apiKeys[model.id].trim() !== '');
  };

  const callOpenAI = async (question, apiKey) => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: question }],
        max_tokens: 500
      })
    });
    
    if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
    const data = await response.json();
    return data.choices[0].message.content;
  };

  const callAnthropic = async (question, apiKey) => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{ role: 'user', content: question }]
      })
    });
    
    if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);
    const data = await response.json();
    return data.content[0].text;
  };

  const callGoogle = async (question, apiKey) => {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: question
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Google API error: ${response.status} - ${errorData}`);
    }
    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('No response generated from Google API');
    }
    
    return data.candidates[0].content.parts[0].text;
  };

  const callCohere = async (question, apiKey) => {
    const response = await fetch('https://api.cohere.ai/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'command',
        prompt: question,
        max_tokens: 500
      })
    });
    
    if (!response.ok) throw new Error(`Cohere API error: ${response.status}`);
    const data = await response.json();
    return data.generations[0].text;
  };

  const callModel = async (modelId, question, apiKey) => {
    switch (modelId) {
      case 'openai':
        return await callOpenAI(question, apiKey);
      case 'anthropic':
        return await callAnthropic(question, apiKey);
      case 'google':
        return await callGoogle(question, apiKey);
      case 'cohere':
        return await callCohere(question, apiKey);
      default:
        throw new Error('Unknown model');
    }
  };

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    if (!question.trim()) return;

    const availableModels = getAvailableModels();
    if (availableModels.length === 0) {
      alert('Please add at least one API key in the settings.');
      return;
    }

    // Reset responses and set loading state
    setResponses({});
    const loadingState = {};
    availableModels.forEach(model => {
      loadingState[model.id] = true;
    });
    setLoading(loadingState);

    // Call all available models concurrently
    const promises = availableModels.map(async (model) => {
      try {
        const response = await callModel(model.id, question, apiKeys[model.id]);
        setResponses(prev => ({ ...prev, [model.id]: response }));
      } catch (error) {
        console.error(`Error with ${model.name}:`, error);
        setResponses(prev => ({ 
          ...prev, 
          [model.id]: `Error: ${error.message}` 
        }));
      } finally {
        setLoading(prev => ({ ...prev, [model.id]: false }));
      }
    });

    await Promise.all(promises);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">Multi-Model AI Chat</h1>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 mb-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Key className="w-5 h-5 mr-2" />
              API Keys Configuration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {models.map(model => (
                <div key={model.id} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    {model.name} API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKeys[model.id] ? "text" : "password"}
                      value={apiKeys[model.id]}
                      onChange={(e) => handleApiKeyChange(model.id, e.target.value)}
                      placeholder={`Enter ${model.name} API key...`}
                      className="w-full px-3 py-2 pr-10 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => toggleApiKeyVisibility(model.id)}
                      className="absolute right-2 top-2 text-gray-400 hover:text-white"
                    >
                      {showApiKeys[model.id] ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-blue-300 text-sm">
                💡 <strong>Tip:</strong> This app makes direct API calls to the respective services. 
                Make sure you have valid API keys and sufficient credits for each service you want to use.
              </p>
            </div>
          </div>
        )}

        {/* Question Input */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 mb-6 border border-slate-700">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Question
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask anything you'd like to compare across different AI models..."
                rows={3}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleSubmit(e);
                  }
                }}
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!question.trim() || getAvailableModels().length === 0}
              className="flex items-center space-x-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              <Send className="w-4 h-4" />
              <span>Ask All Models</span>
            </button>
          </div>
        </div>

        {/* Active Models Indicator */}
        {getAvailableModels().length > 0 && (
          <div className="mb-6">
            <p className="text-gray-300 text-sm mb-2">Active Models:</p>
            <div className="flex flex-wrap gap-2">
              {getAvailableModels().map(model => (
                <div key={model.id} className="flex items-center space-x-2 px-3 py-1 bg-slate-700 rounded-full">
                  <div className={`w-2 h-2 rounded-full ${model.color}`}></div>
                  <span className="text-sm text-white">{model.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Responses Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {getAvailableModels().map(model => (
            <div key={model.id} className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
              {/* Model Header */}
              <div className={`${model.color} px-4 py-3`}>
                <h3 className="text-white font-semibold">{model.name}</h3>
              </div>
              
              {/* Response Content */}
              <div className="p-4">
                {loading[model.id] ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                    <span className="ml-2 text-gray-400">Thinking...</span>
                  </div>
                ) : responses[model.id] ? (
                  <div className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {responses[model.id]}
                  </div>
                ) : (
                  <div className="text-gray-500 italic py-8 text-center">
                    Ready to respond...
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {getAvailableModels().length === 0 && (
          <div className="text-center py-12">
            <Key className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No API Keys Configured</h3>
            <p className="text-gray-500 mb-4">
              Add your API keys in the settings to start comparing AI model responses.
            </p>
            <button
              onClick={() => setShowSettings(true)}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Configure API Keys
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiModelChatApp;