package com.fusion.app.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import com.fusion.app.databinding.FragmentFeedBinding
import com.fusion.app.ui.adapter.PostAdapter
import com.fusion.app.ui.model.Post

class FeedFragment : Fragment() {

    private var _binding: FragmentFeedBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentFeedBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val posts = listOf(
            Post("dev@mastodon.social", "Fusion 1.7 está en camino con mejoras de rendimiento y federación.", "5 min"),
            Post("design@fosstodon.org", "Nuevo tema oscuro adaptativo listo para probar. #Fusion", "32 min"),
            Post("community@mastodon.world", "Gracias a todos los que probaron la beta. ¡Seguimos mejorando!", "2 h")
        )
        binding.rvFeed.layoutManager = LinearLayoutManager(requireContext())
        binding.rvFeed.adapter = PostAdapter(posts)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
